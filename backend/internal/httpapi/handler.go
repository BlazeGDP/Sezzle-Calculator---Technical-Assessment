// Package httpapi translates HTTP requests into calculator calls.
package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"

	"calculator/internal/calculator"
)

const maxBodyBytes = 4096

type calculationRequest struct {
	Operation string     `json:"operation"`
	Operands  []*float64 `json:"operands"`
}

type calculationResponse struct {
	Result float64 `json:"result"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorResponse struct {
	Error errorDetail `json:"error"`
}

// New builds a handler with an optional static frontend for production.
func New(static http.Handler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/calculate", calculate)
	mux.HandleFunc("/api/v1/health", health)
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "API endpoint not found.")
	})
	if static != nil {
		mux.Handle("/", static)
	} else {
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Endpoint not found.")
		})
	}
	return mux
}

func health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Use GET for this endpoint.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func calculate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Use POST for this endpoint.")
		return
	}
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		writeError(w, http.StatusUnsupportedMediaType, "UNSUPPORTED_MEDIA_TYPE", "Send application/json.")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var request *calculationRequest
	if err := decoder.Decode(&request); err != nil {
		writeDecodeError(w, err)
		return
	}
	if request == nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "Send a JSON object.")
		return
	}
	// A second decode must reach EOF; concatenated JSON values are rejected.
	if err := decoder.Decode(new(any)); err != io.EOF {
		writeDecodeError(w, err)
		return
	}
	operands := make([]float64, 0, len(request.Operands))
	for _, operand := range request.Operands {
		if operand == nil {
			writeError(w, http.StatusBadRequest, "INVALID_OPERANDS", "Operands must be numbers, not null.")
			return
		}
		operands = append(operands, *operand)
	}
	result, err := calculator.Calculate(request.Operation, operands)
	if err != nil {
		var calcErr *calculator.Error
		if errors.As(err, &calcErr) {
			writeError(w, http.StatusBadRequest, calcErr.Code, calcErr.Message)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Calculation failed unexpectedly.")
		return
	}
	writeJSON(w, http.StatusOK, calculationResponse{Result: result})
}

func writeDecodeError(w http.ResponseWriter, err error) {
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		writeError(w, http.StatusRequestEntityTooLarge, "BODY_TOO_LARGE", "Request body exceeds 4096 bytes.")
		return
	}
	writeError(w, http.StatusBadRequest, "INVALID_JSON", "Send one JSON object with an operation and numeric operands.")
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: errorDetail{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	// All response values are JSON-serializable and finite.
	_ = json.NewEncoder(w).Encode(value)
}