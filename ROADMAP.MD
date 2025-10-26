# 🗺️ Roadmap to v1.0.0

_Current version: **v0.1.0**_

This roadmap outlines the planned progress toward **v1.0.0** of the project.  
Each phase represents a milestone toward a stable, production-ready release.

---

## v0.1.x – MVP

> Goal: Build a functional minimum viable product

- [x] A working Epub reader
- [x] Save every book in the library to local db for easy access
- [x] Track reading time and show daily/weekly statistics
- [x] Create/Show daily reading goals
- [x] Change preferences on settings page

## v0.2.x - Fixing Issues

> Goal: Fix bugs and unexpected results

- [x] Broken img tags get replaced by a working img with base 64
- [x] Show error messsage when a book can't be loaded in case of deletion from files, or when library path has been changed
- [x] Prevent user from creating more than one General reading goal
- [x] Remove Unimplemented UI components if they are not planned to be implmented in the next minor version
- [x] More responsiveness
- [x] Either make the in-book table of contents work or make the link not redirect
- [x] Add some margin between paragraphs
- [x] Fix the menu items' accent color isnt contrasting well

## v0.3.x - Customizable reader page and more

> Goal: Make the epub reader page more customizable

- [x] multiple font family choices
- [x] Alignment based on preference
- [x] Remember last opened Book with its active chapter
- [x] Next and Prev button

## v0.4.x - Support for PDF

> Goal: Add support for PDF

- [x] A separate reader component for PDF
- [x] Expand the Book Goal and Stat tables to include fields like page_number to accomodate pdf books
- [x] Add UI indicators to differentiate PDF from EPUB

## v0.5.x - Annotation, Highlighting and Related Features

> Goal: Implement features that require selecting specific sections of a book

- [ ] Annotate a specific section with a comment/note
- [ ] Highlight a section with a color of choice
- [ ] Use online dictionary APIs and show meanings of words
- [ ] Have a personal vocabulary table with meanings for each word
- [ ] View all annotations on a sidebar

## v0.6.x - Download Books from Libgen

> Goal: implement book search/download feature

- [ ] Search and Download books from lib-gen

## v0.7.x - Book Curation

> Goal implement ways in whih users can curate their books

- [ ] implement in-app collection of books
- [ ] add a special collection names reading-list
