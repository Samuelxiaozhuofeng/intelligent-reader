## MODIFIED Requirements
### Requirement: Book Language Selection on Import
The system SHALL prompt the user to select a language when importing an EPUB book or a URL.

#### Scenario: User imports a book and selects language
- **WHEN** user selects an EPUB file for import or pastes a URL to import
- **THEN** a modal appears with three language options (English, Spanish, Japanese)
- **AND** the user must select one before import proceeds

#### Scenario: User cancels language selection
- **WHEN** user opens language selection modal
- **AND** user closes the modal without selecting a language
- **THEN** the book import is cancelled
- **AND** no partial book data is saved
