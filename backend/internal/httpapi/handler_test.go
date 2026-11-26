package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCalculateEndpoint(t *testing.T) {
	tests := []struct {
		name, method, contentType, body string
		status                          int
		code                            string
		result                          float64
	}{
		{"add", "POST", "application/json", `{"operation":"add","operands":[2,3]}`, 200, "", 5},
		{"subtract", "POST", "application/json", `{"operation":"subtract","operands":[2,3]}`, 200, "", -1},
		{"multiply", "POST", "application/json", `{"operation":"multiply","operands":[2,3]}`, 200, "", 6},
		{"divide", "POST", "application/json", `{"operation":"divide","operands":[7,2]}`, 200, "", 3.5},
		{"power", "POST", "application/json", `{"operation":"power","operands":[2,3]}`, 200, "", 8},
		{"sqrt", "POST", "application/json; charset=utf-8", `{"operation":"sqrt","operands":[49]}`, 200, "", 7},
		{"percentage", "POST", "application/json", `{"operation":"percentage","operands":[15,200]}`, 200, "", 30},
		{"zero result", "POST", "application/json", `{"operation":"subtract","operands":[1,1]}`, 200, "", 0},
		{"zero divisor", "POST", "application/json", `{"operation":"divide","operands":[3,0]}`, 400, "DIVISION_BY_ZERO", 0},
		{"negative root", "POST", "application/json", `{"operation":"sqrt","operands":[-9]}`, 400, "NEGATIVE_SQUARE_ROOT", 0},
		{"wrong arity", "POST", "application/json", `{"operation":"add","operands":[1]}`, 400, "INVALID_OPERANDS", 0},
		{"null operand", "POST", "application/json", `{"operation":"add","operands":[null,1]}`, 400, "INVALID_OPERANDS", 0},
		{"string operand", "POST", "application/json", `{"operation":"add","operands":["1",2]}`, 400, "INVALID_JSON", 0},
		{"unknown operation", "POST", "application/json", `{"operation":"eval","operands":[1,2]}`, 400, "INVALID_OPERATION", 0},
		{"unknown field", "POST", "application/json", `{"operation":"sqrt","operands":[4],"extra":true}`, 400, "INVALID_JSON", 0},
		{"trailing value", "POST", "application/json", `{"operation":"sqrt","operands":[4]} {}`, 400, "INVALID_JSON", 0},
		{"malformed JSON", "POST", "application/json", `{"operation":`, 400, "INVALID_JSON", 0},
		{"null body", "POST", "application/json", `null`, 400, "INVALID_JSON", 0},
		{"array body", "POST", "application/json", `[]`, 400, "INVALID_JSON", 0},
		{"empty body", "POST", "application/json", ``, 400, "INVALID_JSON", 0},
		{"overflow input", "POST", "application/json", `{"operation":"sqrt","operands":[1e999]}`, 400, "INVALID_JSON", 0},
		{"overflow result", "POST", "application/json", `{"operation":"multiply","operands":[1e308,10]}`, 400, "RESULT_OUT_OF_RANGE", 0},
		{"wrong method", "GET", "application/json", ``, 405, "METHOD_NOT_ALLOWED", 0},
		{"wrong content type", "POST", "text/plain", `{}`, 415, "UNSUPPORTED_MEDIA_TYPE", 0},
		{"large body", "POST", "application/json", strings.Repeat(" ", 5000), 413, "BODY_TOO_LARGE", 0},
		{"large trailing body", "POST", "application/json", `{"operation":"sqrt","operands":[4]}` + strings.Repeat(" ", 5000), 413, "BODY_TOO_LARGE", 0},
	}
	handler := New(nil)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/api/v1/calculate", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", tt.contentType)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)
			if w.Code != tt.status || !strings.HasPrefix(w.Header().Get("Content-Type"), "application/json") {
				t.Fatalf("got HTTP %d, body %s", w.Code, w.Body.String())
			}
			if tt.status == 405 && w.Header().Get("Allow") != "POST" {
				t.Fatal("missing Allow header")
			}
			if tt.code == "" {
				var response map[string]*float64
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil || response["result"] == nil || *response["result"] != tt.result {
					t.Fatalf("unexpected result: %s", w.Body.String())
				}
			} else {
				var response errorResponse
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil || response.Error.Code != tt.code || response.Error.Message == "" {
					t.Fatalf("unexpected error: %s", w.Body.String())
				}
			}
		})
	}
}

func TestRoutes(t *testing.T) {
	static := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("frontend")) })
	for _, tt := range []struct {
		method, path string
		status       int
		body         string
		static       http.Handler
	}{
		{"GET", "/api/v1/health", 200, `"status":"ok"`, nil},
		{"POST", "/api/v1/health", 405, `"METHOD_NOT_ALLOWED"`, nil},
		{"GET", "/api/v1/missing", 404, `"NOT_FOUND"`, static},
		{"GET", "/", 404, `"NOT_FOUND"`, nil},
		{"GET", "/", 200, "frontend", static},
	} {
		w := httptest.NewRecorder()
		New(tt.static).ServeHTTP(w, httptest.NewRequest(tt.method, tt.path, nil))
		if w.Code != tt.status || !strings.Contains(w.Body.String(), tt.body) {
			t.Errorf("%s %s: got %d %s", tt.method, tt.path, w.Code, w.Body.String())
		}
		if tt.status == 405 && w.Header().Get("Allow") != "GET" {
			t.Error("missing Allow header")
		}
	}
}