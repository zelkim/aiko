## ADDED Requirements

### Requirement: Next.js project initialization
The system SHALL be scaffolded as a Next.js App Router project with TypeScript, TailwindCSS, and the `src/` directory structure.

#### Scenario: Project runs successfully
- **WHEN** the developer runs `npm run dev`
- **THEN** the Next.js development server starts and serves the application at localhost

#### Scenario: TypeScript configured
- **WHEN** the project is initialized
- **THEN** TypeScript strict mode is enabled with proper path aliases (`@/` mapping to `src/`)

### Requirement: Prisma database setup
The system SHALL include a Prisma schema defining the core data models (Conversation, Message, CalendarAccount, UserPreference) with PostgreSQL as the provider.

#### Scenario: Database migrations
- **WHEN** the developer runs `npx prisma migrate dev`
- **THEN** the database schema is created/updated successfully

#### Scenario: Prisma client generation
- **WHEN** the developer runs `npx prisma generate`
- **THEN** a typed Prisma client is generated and usable in the application code

### Requirement: ShadCN UI setup
The system SHALL be configured with ShadCN UI as the component library, with the necessary base components installed.

#### Scenario: ShadCN components available
- **WHEN** the developer imports a ShadCN component (e.g., Button, Dialog, Input)
- **THEN** the component renders correctly with the configured theme

### Requirement: Environment template
The system SHALL include a `.env.template` file with all required environment variables documented with inline comments explaining how to generate or obtain each value.

#### Scenario: Template covers all variables
- **WHEN** a developer copies `.env.template` to `.env`
- **THEN** the template includes entries for: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `NEXTAUTH_SECRET` (or equivalent)

#### Scenario: Comments explain setup
- **WHEN** a developer reads `.env.template`
- **THEN** each variable has a comment explaining what it is and how to obtain/generate the value

### Requirement: README as source of truth
The system SHALL include a README.md that serves as the authoritative documentation for the project, with a stated policy that it MUST be updated whenever new changes or features are implemented.

#### Scenario: README contains project overview
- **WHEN** a developer reads the README
- **THEN** it includes: project description, tech stack, setup instructions, environment variable guide, and architecture overview

#### Scenario: README update policy stated
- **WHEN** a developer reads the README
- **THEN** it contains a prominent notice that the README is the main source of truth and MUST be updated with every change or feature addition

### Requirement: Zod schema declarations
The system SHALL use Zod for runtime validation of all API request/response payloads, tool parameters, and configuration values.

#### Scenario: API input validation
- **WHEN** an API route receives a request
- **THEN** the request body is validated against a Zod schema before processing

#### Scenario: Tool parameter validation
- **WHEN** the LLM returns tool call parameters
- **THEN** the parameters are validated against the tool's Zod schema before the tool is executed
