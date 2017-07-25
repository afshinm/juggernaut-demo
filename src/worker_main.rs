mod externs;
extern crate libc;

fn main() {
    println!("starting worker");
    let worker = externs::create_worker("./worker.js");
    externs::call_worker(worker, "worker_fn", "", 0);
    println!("worker called");
}
