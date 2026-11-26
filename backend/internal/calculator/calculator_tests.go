package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name, operation string
		operands        []float64
		want            float64
		code            string
	}{
		{"addition", "add", []float64{12, 8}, 20, ""},
		{"subtraction", "subtract", []float64{3, 8}, -5, ""},
		{"multiplication", "multiply", []float64{-4, 5}, -20, ""},
		{"division", "divide", []float64{7, 2}, 3.5, ""},
		{"decimal arithmetic", "add", []float64{0.1, 0.2}, 0.3, ""},
		{"power", "power", []float64{2, 10}, 1024, ""},
		{"negative exponent", "power", []float64{2, -2}, 0.25, ""},
		{"zero to zero", "power", []float64{0, 0}, 1, ""},
		{"square root", "sqrt", []float64{81}, 9, ""},
		{"zero root", "sqrt", []float64{0}, 0, ""},
		{"percentage", "percentage", []float64{15, 200}, 30, ""},
		{"large percentage", "percentage", []float64{200, 15}, 30, ""},
		{"percentage avoids overflow", "percentage", []float64{1e308, 50}, 5e307, ""},
		{"negative zero", "multiply", []float64{math.Copysign(0, -1), 4}, 0, ""},
		{"unknown operation", "modulo", []float64{2, 3}, 0, "INVALID_OPERATION"},
		{"missing operands", "add", nil, 0, "INVALID_OPERANDS"},
		{"extra operands", "sqrt", []float64{9, 2}, 0, "INVALID_OPERANDS"},
		{"non-finite input", "add", []float64{math.Inf(1), 2}, 0, "INVALID_OPERANDS"},
		{"NaN input", "sqrt", []float64{math.NaN()}, 0, "INVALID_OPERANDS"},
		{"zero divisor", "divide", []float64{5, 0}, 0, "DIVISION_BY_ZERO"},
		{"negative zero divisor", "divide", []float64{5, math.Copysign(0, -1)}, 0, "DIVISION_BY_ZERO"},
		{"negative root", "sqrt", []float64{-1}, 0, "NEGATIVE_SQUARE_ROOT"},
		{"zero negative exponent", "power", []float64{0, -2}, 0, "DIVISION_BY_ZERO"},
		{"non-real exponent", "power", []float64{-4, 0.5}, 0, "INVALID_RESULT"},
		{"overflow", "multiply", []float64{math.MaxFloat64, 2}, 0, "RESULT_OUT_OF_RANGE"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.operation, tt.operands)
			if tt.code != "" {
				var calcErr *Error
				if !errors.As(err, &calcErr) || calcErr.Code != tt.code || err.Error() == "" {
					t.Fatalf("expected %s, got %v", tt.code, err)
				}
				return
			}
			if err != nil || math.IsNaN(got) || math.Abs(got-tt.want) > 1e-12*math.Max(1, math.Abs(tt.want)) {
				t.Fatalf("got %v, %v; want %v", got, err, tt.want)
			}
			if got == 0 && math.Signbit(got) {
				t.Fatal("negative zero must be normalized")
			}
		})
	}
}