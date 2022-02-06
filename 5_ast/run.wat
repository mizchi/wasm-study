(module
  (import "env" "buffer" (memory 1))
  (import "env" "log" (func $log (param i32)))
  (func (export "run") (param $n i32) (result i32)
    ;; (call $log (i32.const 1))
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
          (i32.mul
            (local.get $i)
            (local.get $factorial)
          )
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
    ;; return

    ;; nop

    ;; (loop $not_gonna_loop
    ;;   nop
    ;; )
    ;; (block $jump_to_end
    ;;       ;; br $jump_to_end
    ;;   ;; (i32.const 1)
    ;;   ;; br_if $jump_to_end

    ;;   (call $log (i32.const 99))


    ;;   nop
    ;; )

    ;; (if
    ;;   (i32.const 1)
    ;;   (then
    ;;     (call $log (i32.const 2))
    ;;   )
    ;;   (else
    ;;     nop
    ;;     ;; (call $log (i32.const 3))
    ;;   )
    ;; )
  )
)