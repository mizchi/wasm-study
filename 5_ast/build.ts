const code = `(module
  (import "env" "buffer" (memory 1))
  (import "env" "log" (func $log (param i32)))
  (func (export "run") (param $n i32) (result i32)
    (local $i i32)
    (local $factorial i32)
    (local.set $factorial (i32.const 1))
    (loop $continue
      (block $break
        ;; i++
        (local.set $i
          (i32.add
            (local.get $i)
            (i32.const 1)
          )
        )
        ;; factorial = i * factorial
        (local.set $factorial
          (local.get $i)
          (local.get $factorial)
          (i32.mul)
        )
        ;; (call $log (local.get $i))
        ;; break if i === n
        (br_if $break
          (i32.eq
            (local.get $i)
            (local.get $n)
          )
        )
        br $continue
      )
    )
    local.get $factorial
  )
)`;

Deno.writeTextFileSync("run.wat", code);
