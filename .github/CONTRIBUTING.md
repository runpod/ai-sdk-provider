# Contributing to @runpod/ai-sdk-provider

Thank you for your interest in contributing to the RunPod AI SDK Provider! This document outlines the process for making releases and contributing to the project.

## Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/runpod/ai-sdk-provider.git
   cd ai-sdk-provider
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Run tests**

   ```bash
   pnpm test
   ```

4. **Build the project**
   ```bash
   pnpm build
   ```

## Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Write code following the existing patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   pnpm test
   pnpm build
   ```

## Release Process

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and releases. Here's how to create a release:

### 1. Create a Changeset

When you make changes that should be released, create a changeset:

```bash
pnpm changeset
```

This will prompt you to:

- Select which packages have changed (select `@runpod/ai-sdk-provider`)
- Choose the type of change:
  - **patch**: Bug fixes, small improvements
  - **minor**: New features, backwards compatible changes
  - **major**: Breaking changes
- Write a summary of the changes

Example changeset creation:

```bash
$ pnpm changeset
🦋  Which packages would you like to include? · @runpod/ai-sdk-provider
🦋  Which packages should have a major bump? · No items were selected
🦋  Which packages should have a minor bump? · @runpod/ai-sdk-provider
🦋  Please enter a summary for this change (this will be in the CHANGELOG).
🦋    (submit empty line to open external editor)
🦋  Summary › Add support for streaming responses
```

This creates a markdown file in `.changeset/` describing your changes.

### 2. Commit and Push

```bash
git add .
git commit -m "feat: add streaming support"
git push origin feature/your-feature-name
```

### 3. Create Pull Request

Create a PR to merge your changes into `main`. Include:

- Clear description of changes
- Link to any relevant issues
- Test results

### 4. Automated Release

Once your PR is merged to `main`, our GitHub Actions workflow will:

1. **Create a Version PR**: The workflow creates a PR with:

   - Updated version numbers
   - Generated CHANGELOG.md entries
   - Consumed changeset files

2. **Publish Release**: When the version PR is merged:
   - Package is built and tested
   - Published to npm
   - GitHub release is created

## Release Types

- **Patch (0.1.0 → 0.1.1)**: Bug fixes, documentation updates
- **Minor (0.1.0 → 0.2.0)**: New features, improvements
- **Major (0.1.0 → 1.0.0)**: Breaking changes

## Manual Release (Emergency)

If you need to publish manually:

```bash
# Update versions and generate changelog
pnpm changeset:version

# Build and test
pnpm build
pnpm test

# Publish to npm
pnpm changeset:publish
```

## Best Practices

1. **Always create changesets** for user-facing changes
2. **Write clear changeset summaries** - they become changelog entries
3. **Test thoroughly** before creating PRs
4. **Follow semantic versioning** when choosing change types
5. **Keep PRs focused** - one feature/fix per PR

## Questions?

If you have questions about the release process or contributing:

- Open an issue on GitHub
- Check existing issues for similar questions
- Review the [Changesets documentation](https://github.com/changesets/changesets)
