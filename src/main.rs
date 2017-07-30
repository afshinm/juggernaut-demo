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
enum FlowerClass {
    setosa,
    versicolor,
    virginica
}

#[derive(Debug,Deserialize)]
struct Flower {
    sepal_length: f64,
    sepal_width: f64,
    petal_length: f64,
    petal_width: f64,
    class: FlowerClass,
}

struct NN;

fn get_flower_class(class: FlowerClass) -> Vec<f64> {
    match class {
        FlowerClass::setosa => vec![0f64, 0f64, 1f64],
        FlowerClass::versicolor => vec![0f64, 1f64, 0f64],
        FlowerClass::virginica => vec![1f64, 0f64, 0f64]
    }
}

fn csv_to_dataset(data: String) -> Vec<Sample> {
    let mut dataset = vec![];

    let mut rdr = csv::Reader::from_reader(data.as_bytes());

    for result in rdr.deserialize() {
        let flower: Flower = result.expect("Unable to convert the result");

        dataset.push(Sample::new(vec![flower.sepal_length, flower.sepal_width, flower.petal_length, flower.petal_width], get_flower_class(flower.class)))
    }

    dataset
}

impl NN {
    pub fn new() -> NN {
        return NN {};
    }

    pub fn train(&self) {
        println!("Juggernaut...");

        let fetch_callback = |data: String| {
            let dataset = csv_to_dataset(data);

            println!("Creating the network...");

            let mut test = NeuralNetwork::new(dataset);

            test.add_layer(NeuralLayer::new(7, 4, Sigmoid::new()));

            test.add_layer(NeuralLayer::new(3, 7, Sigmoid::new()));

            println!("Training...");

            test.error(|err| {
                js!{
                    postMessage("{ \"type\": \"error\", \"data\": " + @{err} + "}");
                }
            });

            test.train(2000, 0.1f64);

            println!("Done!!");

            let think = test.evaluate(Sample::predict(vec![5f64,3.4f64,1.5f64,0.2f64]));

            println!("Evaluate [1, 0, 1] = {:?}", think);
        };

        js! {
            var fetch_callback = @{fetch_callback};
            fetch( "/dataset/iris.csv" ).then((res) => res.text()).then(fetch_callback);
            fetch_callback.drop(); // Necessary to clean up the closure on Rust's side.
        }
    }
}

fn main() {
    stdweb::initialize();

    println!("Web worker initialized...");

    let mut nn = NN::new();

    js! {
        var train = @{move || nn.train()};

        this.addEventListener("message", (e) => {
            console.log("The main thread said something", e.data);

            if (e.data.command === "train") {
                train();
            }
        })
    }

    stdweb::event_loop();
}
