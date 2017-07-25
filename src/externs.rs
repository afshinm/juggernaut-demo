use std::ffi::CString;
use libc::*;
use std::str::FromStr;

/// Safe rust wrapper for our JS function `alert`.
pub fn alert(x: &str) {
    let x = CString::new(x).unwrap();
    let ptr = x.as_ptr();
    unsafe { ffi::alert(ptr) }
}

/// Safe rust wrapper for emscripten_run_script_int (basically, JS eval()).
pub fn eval(x: &str) -> i32 {
    let x = CString::new(x).unwrap();
    let ptr = x.as_ptr();
    unsafe { ffi::emscripten_run_script_int(ptr) }
}

/// Creating web worker
pub fn create_worker(url: &str) -> ffi::worker_handle {
    let url = CString::new(url).unwrap();
    let ptr = url.as_ptr();
    unsafe { ffi::emscripten_create_worker(ptr) }
}

extern "C" fn do_something_handler(arg1: *mut c_char, arg2: c_int, arg3: *mut c_void) {
    println!("worker done!");
}

/// Creating web worker
pub fn call_worker(worker: ffi::worker_handle, func_name: &str, data: &str, size: i32) {
    let func_name = CString::new(func_name).unwrap();

    let mut string = String::from_str(data).unwrap();
    let bytes = string.into_bytes();
    let mut cchar : Vec<c_char> = bytes.iter().map(|&w| w as c_char).collect();
    let data_slice = cchar.as_mut_slice();

    let mut state = 42;
    let state_ptr: *mut c_void = &mut state as *mut _ as *mut c_void;

    unsafe {
        ffi::emscripten_call_worker(
            worker,
            func_name.as_ptr(),
            data_slice.as_mut_ptr(),
            size as c_int,
            Some(do_something_handler),
            state_ptr
        )
    };
}

pub fn worker_respond(data: &str, size: i32) {
    let mut string = String::from_str(data).unwrap();
    let bytes = string.into_bytes();
    let mut cchar : Vec<c_char> = bytes.iter().map(|&w| w as c_char).collect();
    let data_slice = cchar.as_mut_slice();

    unsafe {
        ffi::emscripten_worker_respond(
            data_slice.as_mut_ptr(),
            size as c_int
        )
    };
}

pub fn worker_respond_provisionally(data: &str, size: i32) {
    let mut string = String::from_str(data).unwrap();
    let bytes = string.into_bytes();
    let mut cchar : Vec<c_char> = bytes.iter().map(|&w| w as c_char).collect();
    let data_slice = cchar.as_mut_slice();

    unsafe {
        ffi::emscripten_worker_respond_provisionally(
            data_slice.as_mut_ptr(),
            size as c_int
        )
    };
}


// This is mostly standard Rust-C FFI stuff.
mod ffi {
    use libc::*;
    pub type worker_handle = c_int;
    pub type em_worker_callback_func = Option<unsafe extern "C" fn(arg1: *mut c_char,
                                                                   arg2: c_int,
                                                                   arg3: *mut c_void)>;

    extern "C" {
        // This extern is defined in `html/library.js`.
        pub fn alert(x: *const c_char);
        // This extern is built in by Emscripten.
        pub fn emscripten_run_script_int(x: *const c_char) -> c_int;
        pub fn emscripten_create_worker(url: *const c_char) -> worker_handle;
        pub fn emscripten_call_worker(
            worker: worker_handle,
            funcname: *const c_char,
            data: *mut c_char,
            size: c_int,
            callback: em_worker_callback_func,
            arg: *mut c_void
        );
        pub fn emscripten_worker_respond(data: *mut c_char, size: c_int);
        pub fn emscripten_worker_respond_provisionally(data: *mut c_char, size: c_int);
    }
}
