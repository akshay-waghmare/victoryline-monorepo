# CrickZen Agent Instructions

## Wiki-first continuity

For any CrickZen work—implementation, diagnosis, review, rollout, or a return to an earlier task—check the Agentic OS wiki before guessing when context is missing, uncertain, or contradictory.

1. Read `C:/Users/ADMINS/Documents/projects/agentic-os-obsidian/wiki/hot.md`.
2. Search `C:/Users/ADMINS/Documents/projects/agentic-os-obsidian/wiki/index.md` and the relevant wiki pages for the task terms.
3. Prefer the newest matching checkpoint or decision, while separating historical notes from current runtime proof.
4. Verify drift-prone claims against the current repository, public endpoint, deployed image, or exact artifact named by the task.

The wiki is the durable source for prior decisions, rationale, checkpoints, and unresolved gaps. It does not replace live verification, and an old wiki claim must not be presented as current production state without rechecking it.

When work creates a durable CrickZen checkpoint, decision, contradiction, or verified rollout change, update the relevant wiki note and its navigation/cache entries through the existing save workflow. Never save secrets or credentials.

## Constitution and wiki synchronization

The normative repository constitution is `.specify/memory/constitution.md`. The durable
continuity mirror is `C:/Users/ADMINS/Documents/projects/agentic-os-obsidian/wiki/meta/CrickZen Constitution.md`.
For every CrickZen implementation, diagnosis, review, rollout, or Spec Kit task:

1. Consult both constitution records before acting. Use the repository file for normative
   rules and the wiki mirror for rationale, checkpoints, contradictions, and current gates.
2. Treat the constitution version and the wiki mirror date as part of the working context.
3. When amending the constitution, update the wiki mirror, `wiki/index.md`, `wiki/log.md`,
   and `wiki/hot.md` in the same change through the wiki lock/save workflow.
4. When a durable CrickZen decision or checkpoint changes a constitutional rule, update
   the repository constitution or record the rule as an explicit follow-up; do not leave
   the two sources silently divergent.
5. Separate historical checkpoint evidence from current runtime proof, and record later
   contradictions instead of deleting the earlier evidence.
