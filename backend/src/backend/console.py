"""Shared Rich console helpers."""

from __future__ import annotations

from rich.console import Console

console = Console()


def info(message: str) -> None:
    console.print(message)


def success(message: str) -> None:
    console.print(f"[green]✓[/green] {message}")


def warn(message: str) -> None:
    console.print(f"[yellow]![/yellow] {message}")


def heading(message: str) -> None:
    console.print(f"\n[bold cyan]{message}[/bold cyan]")


def done(message: str) -> None:
    console.print(f"[bold green]Done.[/bold green] {message}")
