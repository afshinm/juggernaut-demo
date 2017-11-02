#![recursion_limit = "128"]
#![feature(link_args)]

#[link_args = "-s BUILD_AS_WORKER=1"]
#[macro_use]
extern crate stdweb;

#[macro_use]
extern crate serde_derive;
extern crate serde_json;
extern crate juggernaut;
extern crate csv;
extern crate itertools;

use std::fs::File;
use std::path::PathBuf;
use juggernaut::nl::NeuralLayer;
use juggernaut::nn::NeuralNetwork;
use juggernaut::activation::Activation;
use juggernaut::activation::Sigmoid;
use juggernaut::activation::SoftMax;
use juggernaut::activation::HyperbolicTangent;
use juggernaut::activation::SoftPlus;
use juggernaut::activation::RectifiedLinearUnit;
use juggernaut::cost::cross_entropy::CrossEntropy;

use juggernaut::sample::Sample;
use juggernaut::matrix::MatrixTrait;
use juggernaut::matrix::Matrix;

use itertools::iterate;

#[derive(Debug, Deserialize)]
struct Point {
    X: f32,
    Y: f32,
    Class: i16,
}

struct NN;

fn get_point_class(class: i16) -> Vec<f64> {
    match class {
        // green
        0 => vec![0f64, 0f64, 1f64],
        // orange
        1 => vec![0f64, 1f64, 0f64],
        // blue
        2 => vec![1f64, 0f64, 0f64],
        _ => vec![],
    }
}

fn csv_to_dataset(data: String) -> (Vec<Sample>) {
    let mut dataset = vec![];

    let mut rdr = csv::Reader::from_reader(data.as_bytes());

    for result in rdr.deserialize() {
        let point: Point = result.expect("Unable to convert the result");

        dataset.push(Sample::new(
            vec![point.X as f64, point.Y as f64],
            get_point_class(point.Class),
        ))
    }

    dataset
}

fn generate_test_series() -> Vec<Sample> {
    let mut samples = vec![];
    let x_max: f32 = 2f32;
    let x_min: f32 = -2f32;
    let x_step: f32 = 0.133333f32;

    let y_max: f32 = 2f32;
    let y_min: f32 = -2f32;
    let y_step: f32 = 0.2f32;

    for n in iterate(y_min, |i| i + y_step).take_while(|&i| i <= y_max) {
        for m in iterate(x_min, |j| j + x_step).take_while(|&j| j <= x_max) {
            samples.push(Sample::predict(vec![m as f64, n as f64]))
        }
    }

    samples
}

impl NN {
    pub fn new() -> NN {
        return NN;
    }

    pub fn train(&self, dataset_name: String, epochs: i32, learning_rate: f64) {
        println!("Learning rate: {}", learning_rate);
        println!("Epochs: {}", epochs);
        println!("Dataset: {}", dataset_name);
        println!("Juggernaut...");

        let fetch_callback = move |data: String, epochs: i32, learning_rate: f64| {
            let dataset = csv_to_dataset(data);

            let mut neural_network = NeuralNetwork::new();

            println!("Creating the network...");

            neural_network.add_layer(NeuralLayer::new(4, 2, HyperbolicTangent::new()));
            neural_network.add_layer(NeuralLayer::new(4, 4, RectifiedLinearUnit::new()));
            neural_network.add_layer(NeuralLayer::new(3, 4, SoftMax::new()));

            neural_network.set_cost_function(CrossEntropy);

            println!("Training...");

            neural_network.on_error(|err| {
                js!{
                    postMessage("{ \"type\": \"error\", \"data\": " + @{err} + "}");
                }
            });

            //let sample_row = dataset[0].inputs.clone();

            let dataset_eval = generate_test_series();

            neural_network.on_epoch(move |nn| {
                //let sample_test = sample_row.clone();

                //println!("predicting {:?}", &sample_test);

                /*
                let eval = nn.forward(&vec![Sample::predict(sample_test)])
                    .last()
                    .unwrap()
                    .row(0)
                    .clone();

                let sample_encoded = serde_json::to_string(&eval).unwrap();

                js! {
                    postMessage("{ \"type\": \"epoch\", \"data\": " + @{sample_encoded} + "}");
                }
                */

                let layers_weight = nn.get_layers()
                    .iter()
                    .map(|n| n.weights().body())
                    .collect::<Vec<_>>();

                let layers_encoded = serde_json::to_string(&layers_weight).unwrap();

                js! {
                    postMessage("{ \"type\": \"layers\", \"data\": " + @{layers_encoded} + "}");
                }

                // TODO (afshinm): evaluate of Juggernaut should be able to accept a vec
                //
                let evaluated_dataset = dataset_eval.iter().map(|dataset_item|  {
                    nn
                        .evaluate(dataset_item)
                        .body()
                        .iter()
                        .cloned()
                        .map(|n| {
                            n.iter().cloned()
                                .enumerate()
                                .max_by(|&(i, x), &(j, y)| x.partial_cmp(&y).unwrap())
                                .unwrap()
                        })
                        .collect::<Vec<_>>()
                }).collect::<Vec<_>>();

                let encoded = serde_json::to_string(&evaluated_dataset).unwrap();

                js! {
                    postMessage("{ \"type\": \"datasetEval\", \"data\": " + @{encoded} + "}");
                }
            });

            neural_network.train(dataset, epochs, learning_rate);

            println!("Done!!");

            //let think = test.evaluate(Sample::predict(vec![5f64,3.4f64]));

            //println!("Evaluate [1, 0, 1] = {:?}", think);
        };

        js! {
            var fetch_callback = @{fetch_callback};
            var dataset_path = @{dataset_name};
            fetch("dataset/" + dataset_path + ".csv").then((res) => res.text()).then((dataset) => {
                fetch_callback(dataset, @{epochs}, @{learning_rate});
            });

            fetch_callback.drop(); // Necessary to clean up the closure on Rust's side.
        }
    }
}

fn main() {
    stdweb::initialize();

    println!("Web worker initialized...");

    let mut nn = NN::new();

    js! {
        // to send the ready signal to client
        postMessage("{ \"type\": \"ready\", \"data\": true }");

        var train = @{
            move |dataset_name: String, epochs: i32, learning_rate: f64| {
                nn.train(dataset_name, epochs, learning_rate);
            }
        };

        this.addEventListener("message", (e) => {
            if (e.data.command === "train") {
                train(e.data.datasetName, e.data.epochs, e.data.learningRate);
            }
        })
    }

    stdweb::event_loop();
}
