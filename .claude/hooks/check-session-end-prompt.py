#!/usr/bin/env python
"""Stop hook: enforce that end-of-session messages include a copyable
next-session prompt as a triple-backtick fenced code block.

Triggers ONLY when this session modified docs/SESSION_HANDOFF.md (signaling
session end). The rule is considered satisfied for the session as soon as
ANY assistant text turn AFTER the most recent SESSION_HANDOFF.md edit
contains a triple-backtick fenced block — not just the most recent reply.
This avoids re-blocking on every follow-up assistant turn after the prompt
was already pasted once.

Memory reference: feedback_session_end.md.
ADR reference: ADR-013.
Self-contained — stdlib only. Cross-platform.

Logic:
  1. Parse the transcript JSONL into entries.
  2. Find the index of the LAST Edit/Write/MultiEdit/NotebookEdit targeting
     docs/SESSION_HANDOFF.md anywhere in the session.
  3. If no such edit exists → return (don't block).
  4. Scan every assistant text turn AFTER that index for a triple-backtick
     fenced block. If any has one → return (don't block — rule satisfied).
  5. Otherwise → return decision=block with a reminder.
"""
import json
import os
import re
import sys


def load_hook_input():
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def find_transcript(hook_input):
    tp = hook_input.get("transcript_path")
    if tp and os.path.exists(tp):
        return tp
    sid = hook_input.get("session_id")
    cwd = hook_input.get("cwd") or os.getcwd()
    if not sid:
        return None
    home = os.path.expanduser("~")
    sanitized = cwd.replace(":", "").replace("\\", "-").replace("/", "-").lstrip("-")
    candidate = os.path.join(home, ".claude", "projects", sanitized, sid + ".jsonl")
    return candidate if os.path.exists(candidate) else None


def has_fenced_block(text):
    return bool(re.search(r"```[\s\S]*?```", text or ""))


def scan_transcript(transcript_path):
    """Returns (touched_handoff, rule_satisfied).

    touched_handoff: True if any Edit/Write/MultiEdit/NotebookEdit in this
        session targeted docs/SESSION_HANDOFF.md.
    rule_satisfied: True if at least one assistant text turn AFTER the
        most recent such edit contained a triple-backtick fenced block.
    """
    entries = []
    try:
        with open(transcript_path, encoding="utf-8") as fh:
            for raw in fh:
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    entries.append(json.loads(raw))
                except Exception:
                    continue
    except Exception:
        return (False, False)

    last_handoff_edit_idx = -1
    for i, entry in enumerate(entries):
        if entry.get("isSidechain"):
            continue
        if entry.get("type") != "assistant":
            continue
        msg = entry.get("message") or {}
        content = msg.get("content") or []
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") != "tool_use":
                continue
            name = block.get("name", "")
            if name in ("Edit", "Write", "MultiEdit", "NotebookEdit"):
                inp = block.get("input") or {}
                fp = (inp.get("file_path", "") or "").replace("\\", "/")
                if fp.endswith("docs/SESSION_HANDOFF.md") or fp.endswith("/SESSION_HANDOFF.md"):
                    last_handoff_edit_idx = i

    if last_handoff_edit_idx < 0:
        return (False, False)

    for entry in entries[last_handoff_edit_idx + 1:]:
        if entry.get("isSidechain"):
            continue
        if entry.get("type") != "assistant":
            continue
        msg = entry.get("message") or {}
        content = msg.get("content") or []
        if not isinstance(content, list):
            continue
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text", "") or ""
                if has_fenced_block(text):
                    return (True, True)

    return (True, False)


def main():
    hook_input = load_hook_input()
    transcript = find_transcript(hook_input)
    if not transcript:
        return
    touched_handoff, satisfied = scan_transcript(transcript)
    if not touched_handoff:
        return
    if satisfied:
        return
    output = {
        "decision": "block",
        "reason": (
            "[End-of-session check] You modified docs/SESSION_HANDOFF.md this "
            "session, which signals session end. No triple-backtick fenced "
            "code block has appeared in your assistant text since that edit. "
            "Per memory feedback_session_end.md (and ADR-013), paste the "
            "next-session prompt verbatim as a copyable triple-backtick "
            "fenced block (NOT just a reference to the file). Read the "
            "'Next session prompt' section in docs/SESSION_HANDOFF.md and "
            "paste the entire fenced block to the user now. Once it appears "
            "once in this session, the hook will stop firing."
        ),
    }
    sys.stdout.write(json.dumps(output))


if __name__ == "__main__":
    main()
