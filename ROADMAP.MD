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
- [ ] More responsiveness
- [ ] Either make the in-book table of contents work or make the link not redirect
- [x] Add some margin between paragraphs
- [x] Fix the menu items' accent color isnt contrasting well

## v0.3.x - Customizable reader page and more

> Goal: Make the epub reader page more customizable

- [ ] multiple font family choices
- [ ] Alignment based on preference
- [ ] Remember last opened Book with its active chapter
- [ ] Next and Prev button
- [ ] Show how much is the daily goal progress of the book while reading if there is a goal associated with the book

## v0.5.x - Support for PDF

> Goal: Add support for PDF

- [ ] A separate reader component for PDF
- [ ] Expand the Book Goal and Stat tables to include fields like page_number to accomodate pdf books
- [ ] Add UI indicators to differentiate PDF from EPUB

## v0.4.x - Annotation, Highlighting and Related Features

> Goal: Implement features that require selecting specific sections of a book

- [ ] Annotate a specific section with a comment/note
- [ ] Highlight a section with a color of choice
- [ ] Use online dictionary APIs and show meanings of words
- [ ] Have a personal vocabulary table with meanings for each word
- [ ] View all annotations on a sidebar

## v0.5.x - Donwload Books

> Goal: implement book search/download feature

- [ ] Search and Download books from lib-gen
