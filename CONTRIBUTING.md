# Contributing to LOTG Exams

Thank you for considering contributing to LOTG Exams!

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (browser, OS, etc.)

### Suggesting Features

1. Check if the feature has been suggested in Issues
2. Create a new issue describing:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative solutions considered
   - Any relevant examples

### Contributing Code

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow existing code style
   - Add tests if applicable
   - Update documentation

4. **Test your changes**
   ```bash
   # Frontend
   cd frontend
   npm run build
   npm test

   # Backend
   cd backend
   npm run build
   npm test

   # Infrastructure
   cd .infra
   terraform validate
   terraform plan
   ```

5. **Commit with clear messages**
   ```bash
   git commit -m "Add feature: description of feature"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Describe what changes you made
   - Reference any related issues
   - Include screenshots for UI changes

## Development Guidelines

### Admin Feature Development

The admin interface uses a PDF extraction pipeline powered by Claude AI.

**Pipeline Flow:**
1. PDF uploaded to S3 via presigned URL
2. S3 event triggers `processPdf` Lambda
3. Lambda uses Claude Vision API to extract questions
4. Questions stored in DynamoDB with confidence scores
5. Admin reviews and approves questions
6. Approved questions can be published as a quiz

**Key Files:**
- `backend/src/handlers/processPdf.ts` - PDF extraction logic
- `backend/src/handlers/publishQuiz.ts` - Quiz publishing
- `frontend/src/pages/admin/*` - Admin UI components

**Environment Variables for Admin Lambdas:**
- `TABLE_NAME` - DynamoDB table
- `BUCKET_NAME` - S3 bucket for uploads
- `SECRET_NAME` - Secrets Manager for Claude API key

### Code Style

**TypeScript/JavaScript:**
- Use TypeScript for type safety
- Follow existing naming conventions
- Use meaningful variable names
- Add comments for complex logic

**React:**
- Use functional components with hooks
- Keep components focused and reusable
- Use TypeScript interfaces for props

**Terraform:**
- Use descriptive resource names
- Add comments for complex configurations
- Follow Terraform best practices

### Commit Messages

Format: `<type>: <description>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat: add quiz timer feature
fix: resolve API timeout on large quizzes
docs: update deployment instructions
```

### Testing

- Test changes locally before submitting PR
- Add tests for new features
- Ensure existing tests pass

### Documentation

- Update README if adding features
- Document new API endpoints
- Update relevant module READMEs

## Quiz Content Contributions

### Adding New Quizzes

There are two methods to add quizzes:

#### Method 1: PDF Upload via Admin UI (Recommended)

1. Navigate to `/admin/upload` in the application
2. Upload a PDF containing exam questions
3. Claude AI extracts questions automatically
4. Review extracted questions at `/admin/review`
5. Publish as a quiz from the job detail page

#### Method 2: Manual JSON + Seed Script

1. **Create quiz data file**
   - Follow format in `data/sample-quizzes.json`
   - Include accurate references to IFAB Laws
   - Provide clear explanations

2. **Validate content**
   - Verify accuracy against official IFAB Laws
   - Check spelling and grammar
   - Ensure questions are clear and unambiguous

3. **Run the seed script**
   ```bash
   cd scripts
   node seed-database.js ../data/your-quiz.json
   ```

4. **Submit for review**
   - Create PR with quiz data
   - Include source references
   - Explain rationale for quiz topic

### Content Guidelines

- Questions must be based on current IFAB Laws of the Game
- Include exact law references (e.g., "Law 1.3")
- Provide clear, educational explanations
- Use inclusive language
- Avoid trick questions

## Code Review Process

1. Maintainers review all PRs
2. Feedback may be provided for improvements
3. Once approved, PR will be merged
4. Changes deploy automatically to production

## Community Guidelines

- Be respectful and constructive
- Welcome newcomers
- Focus on improving the project
- Follow GitHub's Code of Conduct

## Questions?

Open an issue or reach out to maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
