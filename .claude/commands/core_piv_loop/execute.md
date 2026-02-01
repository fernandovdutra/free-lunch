---
description: Execute an implementation plan
argument-hint: [path-to-plan]
---

# Execute: Implement from Plan

## Plan to Execute

Read plan file: `$ARGUMENTS`

## Execution Instructions

### 1. Read and Understand

- Read the ENTIRE plan carefully
- Understand all tasks and their dependencies
- Note the validation commands to run
- Review the testing strategy

### 2. Execute Tasks in Order

For EACH task in "Step by Step Tasks":

#### a. Navigate to the task

- Identify the file and action required
- Read existing related files if modifying

#### b. Implement the task

- Follow the detailed specifications exactly
- Maintain consistency with existing code patterns
- Include proper type hints and documentation
- Add structured logging where appropriate

#### c. Verify as you go

- After each file change, check syntax
- Ensure imports are correct
- Verify types are properly defined

### 3. Implement Testing Strategy

After completing implementation tasks:

- Create all test files specified in the plan
- Implement all test cases mentioned
- Follow the testing approach outlined
- Ensure tests cover edge cases

### 4. Run Validation Commands

Execute ALL validation commands from the plan in order:

```bash
# Run each command exactly as specified in plan
```

If any command fails:

- Fix the issue
- Re-run the command
- Continue only when it passes

### 5. Run E2E Tests (REQUIRED for UI Features)

**CRITICAL: All user-facing features MUST have E2E tests that pass in a real browser.**

#### a. Write E2E Tests

- Create E2E test file in `e2e/` directory
- Test all user flows for the implemented feature
- Include happy path and error scenarios
- Use `{ exact: true }` option for `getByText` when text might match multiple elements
- Don't use `waitForLoadState('networkidle')` with Firestore - use element visibility instead

#### b. Start Required Services

**Firebase emulators MUST be running for authenticated tests:**

```bash
# Start Firebase emulators in background
npm run firebase:emulators &

# Wait for emulators to be ready (check http://localhost:4000)
sleep 10

# Verify emulators are running
curl -s http://127.0.0.1:9099 | head -1
```

The dev server will start automatically via Playwright config.

#### c. Run E2E Tests

```bash
# Run all E2E tests (headless)
npm run e2e

# Or run in headed mode to visually debug
npm run e2e:headed

# Or use Playwright UI for interactive debugging
npx playwright test --ui
```

#### d. Interpret Results

- **Passed**: Test completed successfully
- **Skipped**: Test requires auth but emulators aren't running - this is OK during initial development
- **Failed**: Must be fixed before completing

#### e. Fix Failing Tests

Common issues and solutions:

- **Strict mode violation**: Use `.first()` or `{ exact: true }` for ambiguous selectors
- **Timeout on networkidle**: Replace with `await expect(element).toBeVisible()`
- **Auth failures**: Ensure emulators are running and accessible
- **Element not found**: Check if element renders conditionally, increase timeout

**Do NOT skip E2E testing. All E2E tests must pass before completing.**

### 6. Final Verification

Before completing:

- ✅ All tasks from plan completed
- ✅ All unit tests created and passing
- ✅ All E2E tests created and passing
- ✅ All validation commands pass
- ✅ Code follows project conventions
- ✅ Documentation added/updated as needed
- ✅ Changes committed with `/commit`
- ✅ Frontend rebuilt with `npm run build`
- ✅ Deployed to production with `firebase deploy`

## Output Report

Provide summary:

### Completed Tasks

- List of all tasks completed
- Files created (with paths)
- Files modified (with paths)

### Tests Added

- Test files created
- Test cases implemented
- Test results

### Validation Results

```bash
# Output from each validation command
```

### Ready for Commit

- Confirm all changes are complete
- Confirm all validations pass
- Ready for `/commit` command

### Deployment (After Commit)

After committing, deploy to production:

#### a. Rebuild Frontend

**IMPORTANT: Always rebuild the frontend before deploying to ensure the latest changes are included.**

```bash
npm run build
```

This compiles TypeScript and builds the Vite production bundle in `dist/`.

#### b. Deploy to Firebase

```bash
# Deploy everything (functions + hosting)
npm run firebase:deploy

# Or deploy separately if needed:
firebase deploy --only functions    # Cloud Functions only
firebase deploy --only hosting      # Frontend only
```

#### c. Verify Deployment

- Check the Hosting URL: https://free-lunch-85447.web.app
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) to bypass browser cache
- Test the new features in production
- Monitor Firebase Console for any function errors

#### d. Common Deployment Issues

- **Stale frontend**: Forgot to run `npm run build` before `firebase deploy`
- **Browser cache**: Users need hard refresh to see updates
- **Firestore index errors**: Usually non-critical, can deploy with `--only functions,hosting`
- **Function cold starts**: First invocation after deploy may be slow

## Notes

- If you encounter issues not addressed in the plan, document them
- If you need to deviate from the plan, explain why
- If tests fail, fix implementation until they pass
- Don't skip validation steps
