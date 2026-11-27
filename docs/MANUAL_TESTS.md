# Manual verification checklist

Run the frontend and backend as described in the root README. This is a checklist for local execution, not a claim that these browser tests were executed in the preparation environment.

## Functional tests

For each row, select the indicated operation, enter the operands and click **Calculate**. Confirm the result or message. Clear or edit fields between cases.

| Operation | First input | Second input | Expected result or feedback |
| --- | --- | --- | --- |
| Add | 12 | 8 | 20 |
| Subtract | 3 | 8 | -5 |
| Multiply | -4 | 5 | -20 |
| Divide | 7 | 2 | 3.5 |
| Power | 2 | 10 | 1024 |
| Square root | 81 | Not shown | 9 |
| Percentage | 15 | 200 | 30 |
| Add | 0 | 0 | 0, not an empty result |
| Add | 1.5 | 2.25 | 3.75 |
| Multiply | 1e3 | 2 | 2000 |
| Divide | 5 | 0 | Cannot divide by zero. |
| Square root | -9 | Not shown | Square root requires a non-negative number. |
| Power | -4 | 0.5 | The operation has no real-valued result. |
| Power | 0 | -2 | Zero cannot be raised to a negative power. |
| Multiply | 1e308 | 10 | The result exceeds the supported numeric range. |
| Add | Empty | 2 | Enter a valid first number. |
| Add | 1 | abc | Enter a valid second number. |
| Add | 1e999 | 1 | Enter a valid first number. |

## UX and integration

- [ ] Open browser developer tools and verify a valid calculation makes a `POST /api/v1/calculate` request with the expected operands and displays the JSON result.
- [ ] Confirm invalid numeric text triggers local validation without a network request.
- [ ] Change an operand or operation after a successful calculation; the old result is cleared.
- [ ] Switch to Square root; the second input is hidden and the request contains one operand.
- [ ] Press Enter while editing an operand to submit the form.
- [ ] Press Clear; operation resets to Add, both inputs and feedback are cleared, and the first input receives focus.
- [ ] Tab through controls; focus is visible and controls have accessible names.
- [ ] Use the browser device toolbar at 375px width and confirm the layout stacks without horizontal scrolling.
- [ ] Stop the backend, submit a valid calculation, and confirm a readable network or service error. Restart it and retry successfully.
- [ ] Optionally throttle the network to observe the pending state and disabled controls.
- [ ] With the backend running, run `npm run test:live` in `frontend/`.
- [ ] Run `npm test`, `npm run coverage`, `npm run build`, and `go test ./...` successfully.
- [ ] If Docker is available, build and run the image; repeat a calculation at port 8080.
