#![recursion_limit = "128"]
#![feature(link_args)]

#[link_args = "-s BUILD_AS_WORKER=1"]

#[macro_use]
extern crate stdweb;

#[macro_use]
extern crate serde_derive;
extern crate juggernaut;
extern crate csv;

use std::fs::File;
use std::path::PathBuf;
use juggernaut::nl::NeuralLayer;
use juggernaut::nn::NeuralNetwork;
use juggernaut::activation::Activation;
use juggernaut::activation::Sigmoid;
use juggernaut::activation::HyperbolicTangent;
use juggernaut::activation::SoftPlus;

use juggernaut::sample::Sample;
use juggernaut::matrix::MatrixTrait;

#[derive(Debug,Deserialize)]
struct Point {
    X: f64,
    Y: f64,
    Class: i16,
}

struct NN<T> where T: juggernaut::activation::Activation {
    instance: Option<NeuralNetwork<T>>
}

fn get_point_class(class: i16) -> Vec<f64> {
    match class {
        0 => vec![0f64, 0f64, 1f64],
        1 => vec![0f64, 1f64, 0f64],
        2 => vec![1f64, 0f64, 0f64],
        _ => vec![]
    }
}

fn csv_to_dataset(data: String) -> Vec<Sample> {
    let mut dataset = vec![];

    let mut rdr = csv::Reader::from_reader(data.as_bytes());

    for result in rdr.deserialize() {
        let point: Point = result.expect("Unable to convert the result");

        dataset.push(Sample::new(vec![point.X, point.Y], get_point_class(point.Class)))
    }

    dataset
}

impl<T> NN<T> where T: juggernaut::activation::Activation {
    pub fn new() -> NN<T> {
        return NN {
            instance: None
        };
    }

    pub fn train(&self, dataset_name: String, epochs: i32, learning_rate: f64) {
        println!("Learning rate: {}", learning_rate);
        println!("Epochs: {}", epochs);
        println!("Dataset: {}", dataset_name);
        println!("Juggernaut...");

        let fetch_callback = |data: String, epochs: i32, learning_rate: f64| {
            let dataset = csv_to_dataset(data);

            println!("Creating the network...");

            let mut test = NeuralNetwork::new(dataset);

            test.add_layer(NeuralLayer::new(7, 2, HyperbolicTangent::new()));

            test.add_layer(NeuralLayer::new(3, 7, HyperbolicTangent::new()));

            println!("Training...");

            test.error(|err| {
                js!{
                    postMessage("{ \"type\": \"error\", \"data\": " + @{err} + "}");
                }
            });

            test.train(epochs, learning_rate);

            self.instance = Some(test);

            println!("Done!!");

            let think = test.evaluate(Sample::predict(vec![5f64,3.4f64]));

            println!("Evaluate [1, 0, 1] = {:?}", think);
        };

        js! {
            var fetch_callback = @{fetch_callback};
            var dataset_path = @{dataset_name};
            fetch("/dataset/" + dataset_path + ".csv").then((res) => res.text()).then((dataset) => {
                fetch_callback(dataset, @{epochs}, @{learning_rate});
            });

            fetch_callback.drop(); // Necessary to clean up the closure on Rust's side.
        }
    }
}

fn main() {
    stdweb::initialize();

    println!("Web worker initialized...");

    let mut nn: NN<HyperbolicTangent> = NN::new();

    js! {
        var train = @{move |dataset_name: String, epochs: i32, learning_rate: f64| nn.train(dataset_name, epochs, learning_rate)};

        this.addEventListener("message", (e) => {
            console.log("The main thread said something", e.data);

            if (e.data.command === "train") {
                train(e.data.datasetName, e.data.epochs, e.data.learningRate);
            }
        })
    }

    stdweb::event_loop();
}
