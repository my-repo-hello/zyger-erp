package in.zygertechnology.zygererp.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String,String> business(IllegalArgumentException e) {
        return Map.of("message", e.getMessage() == null ? "Bad request" : e.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String,String> conflict(IllegalStateException e) {
        return Map.of("message", e.getMessage() == null ? "Conflict" : e.getMessage());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String,String> optimisticLock(ObjectOptimisticLockingFailureException e) {
        log.warn("Optimistic lock failure: {}", e.getMessage());
        return Map.of("message", "This document was modified by another user. Please refresh and try again.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String,String> dataIntegrity(DataIntegrityViolationException e) {
        log.warn("Data integrity violation: {}", e.getMessage());
        String msg = e.getMessage();
        if (msg != null && msg.contains("duplicate key")) {
            return Map.of("message", "A record with this code already exists. Please use a different code.");
        }
        return Map.of("message", "Data integrity violation. Please check your input.");
    }

    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String,String> runtime(RuntimeException e) {
        log.error("Unhandled runtime exception", e);
        String msg = e.getMessage() != null ? e.getMessage() : "An unexpected error occurred. Please try again.";
        return Map.of("message", msg);
    }

    @ExceptionHandler(InvalidDataAccessResourceUsageException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String,String> dbError(InvalidDataAccessResourceUsageException e) {
        log.error("Database error", e);
        return Map.of("message", "Database error. Please contact support.");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public Map<String,String> methodNotAllowed(HttpRequestMethodNotSupportedException e) {
        return Map.of("message", "Method not allowed: " + e.getMethod());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public Map<String,Object> validation(MethodArgumentNotValidException e) {
        var fieldErrors = e.getBindingResult().getFieldErrors().stream()
            .map(fe -> Map.of("field", fe.getField(), "message", fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid"))
            .toList();
        return Map.of("message", "Validation failed", "errors", fieldErrors);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String,String> generic(Exception e) {
        log.error("Unexpected exception", e);
        String msg = e.getMessage() != null ? e.getMessage() : "An unexpected error occurred. Please try again.";
        return Map.of("message", msg);
    }
}
