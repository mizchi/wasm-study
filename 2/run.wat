(module
  (import "env" "buffer" (memory 1))
  (func (export "run")
    global.get $string_ptr
    global.get $string_len
    return (i32.const 1)
  )
)