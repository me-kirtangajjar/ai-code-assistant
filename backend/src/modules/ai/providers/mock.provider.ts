import type { AIProvider } from '../ai.provider.js';
import type { AIExplanationContext } from '../ai.types.js';

const explanations: Readonly<Record<string, string>> = {
  ZeroDivisionError: `Python cannot divide a number by zero because division by zero has no defined result.

Why it happened: the value used as the divisor became zero.

Suggested fix: check the divisor before dividing.

\`\`\`python
divisor = 0
if divisor != 0:
    result = 10 / divisor
    print(result)
else:
    print("The divisor must not be zero.")
\`\`\``,
  SyntaxError: `Python could not understand the code because its syntax is incomplete or incorrectly structured.

Why it happened: common causes include a missing colon, quote, bracket, or incorrect statement layout. Use the line shown in Python's error message to locate it.

Suggested fix: correct the reported line and check the line immediately before it.

\`\`\`python
condition = True
if condition:
    print("The syntax is valid.")
\`\`\``,
  IndentationError: `Python uses indentation to define code blocks, and the reported lines do not have consistent indentation.

Why it happened: a block is missing indentation or mixes indentation levels.

Suggested fix: use four spaces for each block level.

\`\`\`python
if True:
    print("This line is inside the block.")
\`\`\``,
  NameError: `Python tried to use a name that has not been defined in the current scope.

Why it happened: the variable may be misspelled or used before a value was assigned.

Suggested fix: define the value before using it and keep the spelling consistent.

\`\`\`python
value = 10
print(value)
\`\`\``,
  TypeError: `Python received a value of an incompatible type for the requested operation.

Why it happened: the operation combines values that Python cannot use together directly.

Suggested fix: use compatible values or convert the value deliberately.

\`\`\`python
number = 10
text = "5"
print(number + int(text))
\`\`\``,
};

export class MockAIProvider implements AIProvider {
  async generateExplanation(context: AIExplanationContext): Promise<string> {
    return (
      explanations[context.errorType ?? ''] ??
      `Python reported ${context.errorType ?? 'an error'} while processing the submitted code.

Why it happened: the final line of Python's error output identifies the error category, and the traceback points to the affected line.

Suggested fix: inspect that line, correct the value or operation described by Python, and run the code again.

\`\`\`python
# Correct the line identified in the Python traceback, then run the program again.
\`\`\``
    );
  }
}
