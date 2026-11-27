// Package calculator implements arithmetic independently of HTTP.
package calculator

import (
	"fmt"
	"math"
)

// Error is a validation or arithmetic error safe to expose to clients.
type Error struct {
	Code    string
	Message string
}

func (e *Error) Error() string { return e.Message }

// Calculate evaluates one operation using finite IEEE 754 numbers.
// Percentage means the first operand percent of the second operand.
func Calculate(operation string, operands []float64) (float64, error) {
	var arity int
	switch operation {
	case "add", "subtract", "multiply", "divide", "power", "percentage":
		arity = 2
	case "sqrt":
		arity = 1
	default:
		return 0, &Error{"INVALID_OPERATION", "Choose a supported operation."}
	}
	if len(operands) != arity {
		return 0, &Error{"INVALID_OPERANDS", fmt.Sprintf("This operation requires %d operand(s).", arity)}
	}
	for _, operand := range operands {
		if math.IsNaN(operand) || math.IsInf(operand, 0) {
			return 0, &Error{"INVALID_OPERANDS", "Operands must be finite numbers."}
		}
	}

	a := operands[0]
	var result float64
	if operation == "sqrt" {
		if a < 0 {
			return 0, &Error{"NEGATIVE_SQUARE_ROOT", "Square root requires a non-negative number."}
		}
		result = math.Sqrt(a)
	} else {
		b := operands[1]
		switch operation {
		case "add":
			result = a + b
		case "subtract":
			result = a - b
		case "multiply":
			result = a * b
		case "divide":
			if b == 0 {
				return 0, &Error{"DIVISION_BY_ZERO", "Cannot divide by zero."}
			}
			result = a / b
		case "power":
			if a == 0 && b < 0 {
				return 0, &Error{"DIVISION_BY_ZERO", "Zero cannot be raised to a negative power."}
			}
			result = math.Pow(a, b)
		case "percentage":
			// Divide the larger magnitude first to reduce intermediate overflow/underflow.
			if math.Abs(a) >= math.Abs(b) {
				result = (a / 100) * b
			} else {
				result = a * (b / 100)
			}
		}
	}
	if math.IsNaN(result) {
		return 0, &Error{"INVALID_RESULT", "The operation has no real-valued result."}
	}
	if math.IsInf(result, 0) {
		return 0, &Error{"RESULT_OUT_OF_RANGE", "The result exceeds the supported numeric range."}
	}
	// Normalize negative zero for consistent JSON and display.
	if result == 0 {
		return 0, nil
	}
	return result, nil
}
