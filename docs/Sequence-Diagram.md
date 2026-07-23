# Python Execution Sequence Diagram

## 1. Complete Lifecycle

The diagram shows the complete intended orchestration for one `POST /api/v1/analysis/run` request. The
Python Runner is an internal backend boundary, not a separately deployed service. Sprint 5 implements
the conditional AI branch without changing runner behavior.

```mermaid
sequenceDiagram
    autonumber
    actor Frontend
    participant Backend as Express Backend
    participant Analysis as Analysis Module
    participant Runner as Python Runner
    participant Docker
    participant Python
    participant AI as AI Provider
    participant MongoDB

    Frontend->>Backend: POST /api/v1/analysis/run<br/>Bearer token + code
    Backend->>Backend: Authenticate bearer token
    Backend->>Backend: Validate strict request body

    alt Authentication or validation fails
        Backend-->>Frontend: Standard 4xx failure envelope
    else Request accepted
        Backend->>Analysis: Run analysis for authenticated user
        Analysis->>Runner: Execute { language: python, code }
        Runner->>Runner: Create private temporary directory
        Runner->>Runner: Write exact source to main.py
        Runner->>Docker: Create isolated, limited container
        Docker->>Python: Start fixed interpreter on /workspace/main.py

        par Capture stdout
            Python-->>Docker: stdout bytes
            Docker-->>Runner: stdout stream
        and Capture stderr
            Python-->>Docker: stderr bytes
            Docker-->>Runner: stderr stream
        end

        alt Python exits before policy limit
            Python-->>Docker: Exit code
            Docker-->>Runner: Completion state
        else Timeout, output limit, or memory limit
            Runner->>Docker: Stop/kill exact container ID
            Docker-->>Runner: Termination/inspection state
        else Docker or runner failure
            Docker-->>Runner: Controlled infrastructure failure
        end

        Runner->>Docker: Inspect then remove container
        Runner->>Runner: Delete private temporary directory
        Runner->>Runner: Classify execution facts
        Runner-->>Analysis: ExecutionResult

        alt status is python_error
            Analysis->>AI: Explain existing Python error context
            alt AI explanation succeeds
                AI-->>Analysis: Educational explanation
            else AI provider fails
                AI-->>Analysis: Controlled provider failure
                Analysis->>Analysis: Keep aiExplanation null
            end
        else status is success or runner_error
            Analysis->>Analysis: Skip AI
        end

        Analysis->>MongoDB: Save complete submission attempt
        alt Persistence succeeds
            MongoDB-->>Analysis: Stored submission
            Analysis-->>Backend: Submission or mapped runner failure
            Backend-->>Frontend: Standard 201/422/503/504 response
        else Persistence fails
            MongoDB-->>Analysis: Database unavailable
            Analysis-->>Backend: DATABASE_UNAVAILABLE
            Backend-->>Frontend: Standard 503 failure envelope
        end
    end
```

## 2. Responsibility Notes

- **Frontend:** supplies the bearer token and Python source, then renders the backend result.
- **Backend:** owns HTTP authentication, validation, standard responses, and error translation.
- **Analysis Module:** orchestrates execution, conditional AI explanation, and persistence.
- **Python Runner:** owns workspace creation, Docker lifecycle, bounded capture, timing, classification,
  and cleanup.
- **Docker:** enforces the configured isolation and resource controls.
- **Python:** detects syntax/runtime errors and produces stdout, stderr, and an exit code.
- **AI Provider:** only explains an already classified `python_error` and cannot alter execution facts.
- **MongoDB:** stores every successful, Python-error, and runner-error attempt when available.

## 3. Ordering Guarantees

1. Authentication and request validation finish before temporary resources are created.
2. Container/workspace cleanup finishes before the runner result is handed to the analysis module.
3. AI is invoked only after Python has produced a `python_error` result.
4. Persistence occurs after the best-effort explanation attempt.
5. The frontend receives a success claim only after MongoDB confirms storage.

Cleanup failures are separate operational events and do not replace the primary execution result.
Startup reports and reconciles leftover runner-labeled containers and safely prefixed workspaces.
