---
title: "x86 Banking System"
kicker: "Systems — CSE341"
tier: "additional"
order: 6
period: "2026"
summary: "A working banking application written in 8086 assembly — account state, transactions and a text UI, with no standard library underneath."
lede: "Everything the language gives you for free, written by hand."
role: "Sole author."
stack:
  - "x86 Assembly"
  - "emu8086"
domains:
  - "Systems"
  - "Low-level"
links: {}
---

Account creation, deposits, withdrawals, balance enquiry and transaction history
in 8086 assembly: no heap, no string type, no formatted output. Numeric parsing
and rendering, interrupt-driven console I/O, and register-level state management
are all explicit.

Useful precisely because it removes every abstraction — memory layout and calling
conventions stop being trivia and become the program.
