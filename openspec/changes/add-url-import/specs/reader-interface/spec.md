## ADDED Requirements
### Requirement: URL Import to Bookshelf
The system SHALL allow users to import readable content by pasting an HTTP(S) URL on the bookshelf.

#### Scenario: User imports a URL
- **WHEN** user selects the "Import URL" action and enters a valid HTTP(S) link
- **AND** user selects a language for the book
- **THEN** the system queues processing
- **AND** the book appears on the bookshelf with a processing status

#### Scenario: Invalid or blocked URL
- **WHEN** user enters an invalid or blocked URL
- **THEN** the system shows an error message
- **AND** no book record is created
