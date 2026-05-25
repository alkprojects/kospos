#!/usr/bin/env python
"""Stop hook: enforce that end-of-session messages include a copyable
next-session prompt as a triple-backtick fenced code block.

Triggers ONLY when this session modified docs/SESSION_HANDOFF.md (signaling
session end). If the most recent main-thread assistant final reply doesn't
contain a triple-backtick fenced block, returns decision=block with a
reminder telling Claude to paste the prompt.

Memory reference: feedback_end_of_session_prompt.md.
Self-contained — stdlib only. Cross-platform.

Logic:
  1. Parse the transcript JSONL into entries.
  2. Find the most recent REAL user turn (excludes tool_result-only entries
     which are stored with type=='user').
  3. Concatenate text from every non-sidechain assistant entry after that
     boundary — that's the full final reply.
  4. If any Edit/Write/MultiEdit/NotebookEdit anywhere in the session
     targeted docs/SESSION_HANDOFF.md AND the final reply has no fenced
     block → return decision=block.
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


def scan_transcript(transcript_path):
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
        return (False, "")

    def is_real_user_turn(entry):
        """True if this user entry is a genuine user prompt (not a
        tool_result-only entry). Tool results are stored with
        type=='user'; we exclude them so the boundary aligns with actual
        conversation turns."""
        if entry.get("type") != "user":
            return False
        if entry.get("isSidechain"):
            return False
        msg = entry.get("message") or {}
        content = msg.get("content")
        if isinstance(content, str):
            return True
        if isinstance(content, list):
            for block in content:
                if not isinstance(block, dict):
                    continue
                if block.get("type") in (None, "text"):
                    return True
                # tool_result blocks don't count
        return False

    touched_handoff = False
    last_user_idx = -1
    for i, entry in enumerate(entries):
        if is_real_user_turn(entry):
            last_user_idx = i
            continue
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
                    touched_handoff = True

    final_text_parts = []
    for entry in entries[last_user_idx + 1:]:
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
                final_text_parts.append(block.get("text", "") or "")

    return (touched_handoff, "\n".join(final_text_parts))


def has_fenced_block(text):
    return bool(re.search(r"```[\s\S]*?```", text or ""))


def main():
    hook_input = load_hook_input()
    transcript = find_transcript(hook_input)
    if not transcript:
        return
    touched_handoff, last_text = scan_transcript(transcript)
    if not touched_handoff:
        return
    if has_fenced_block(last_text):
        return
    output = {
        "decision": "block",
        "reason": (
            "[End-of-session check] You modified docs/SESSION_HANDOFF.md this "
            "session, which signals session end. Your most recent message does "
            "not contain a triple-backtick fenced code block. Per memory "
            "feedback_end_of_session_prompt.md, you must paste the next-session "
            "prompt verbatim as a copyable triple-backtick fenced block in your "
            "final reply (NOT just a reference to the file). Read the 'Next "
            "session prompt' section in docs/SESSION_HANDOFF.md and paste the "
            "entire fenced block to the user now."
        ),
    }
    sys.stdout.write(json.dumps(output))


if __name__ == "__main__":
    main()
