# Juggernaut Demo

Hello world with Juggernaut.

## Libraries

Libraries that I have used to develop this project:

 - React
 - D3js
 - Juggernaut

## Build

You need Rust 1.x and `wasm` enabled target for Cargo.  

Then run following command to build the Rust and wasm files:

```
cargo build --target=wasm32-unknown-emscripten --verbose 
```

then copy the targets to: 

```
cp target/wasm32-unknown-emscripten/debug/deps/* ./web/src/wasm~
```

and finally `cd` to `web` folder and run: 

```
node server.js
```

(Sorry about that, I will write a makefile soon)

## Creator

Afshin Mehrabani (afshin.meh@gmail.com)

## License

GPLv3
