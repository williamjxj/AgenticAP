# Hybrid Retrieval with Reciprocal Rank Fusion (RRF)

The hybrid retrieval subsystem is the primary locus of technical uncertainty and active R&D. Its workflow is designed to maximize retrieval accuracy and minimize hallucination by leveraging both semantic and structured search, then fusing results for robust LLM-based field resolution.

## Workflow Overview

**Step 1 — Query Decomposition**  
The LLM decomposes extracted invoice fields into two parallel query types:
- **Semantic embedding query**: Used for tasks like vendor name resolution and general ledger (GL) classification.
- **Structured SQL query**: Used for tasks like purchase order (PO) matching and contract lookup.

**Step 2 — Parallel Execution**  
Both queries are executed simultaneously:
- The semantic query runs against the vector database.
- The structured query runs against the relational (SQL) database.

**Step 3 — RRF Fusion**  
Results from both retrieval paths are merged using **Reciprocal Rank Fusion (RRF)**, a rank-aggregation algorithm that combines ranked lists from heterogeneous retrieval systems without requiring score normalization.

**Step 4 — LLM Arbitration**  
The fused result set is passed to the LLM for final field resolution. The retrieval evidence serves as grounding context, reducing the risk of hallucination and improving extraction reliability.

---

> This document outlines the planned hybrid retrieval architecture and the use of RRF for robust, production-grade invoice field extraction.
