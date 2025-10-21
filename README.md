
# Natural Language Processing — a personal diary

This repository is a personal collection of experiments, notes, and working code related to natural language processing. It is a living research and engineering log: notebooks, short scripts, and exploratory projects are kept here as records of ideas, failures, and progress.

I aim for clarity and reproducibility in my own work; this repo is not a packaged library or a curated tutorial collection. Read items as first drafts, experiments, and thought-traces.

Relevant personal profile and work are available at: [ashioyajotham.github.io](https://ashioyajotham.github.io/)

## What this repository contains

- `Conversational AI/` — chatbots and dialogue experiments (Rasa, OpenAI-based prototypes, action servers).
- `Creative AI/` — multimodal and generative experiments (MusicGen examples, creative pipelines).
- `Natural Language Generation (NLG)/` — generation-focused scripts and notebooks.
- `Natural Language Understanding (NLU)/` — classifiers, summarizers, sentiment analyses, and related notebooks.

Within each folder you'll typically find interactive notebooks used during exploration and a few supporting scripts for repeatable runs. Not every experiment is production-ready; many are intentionally minimal so results are easy to reproduce locally.

## Intent and norms

- This is my personal research archive and experiment log. Content reflects experiments I ran, notes I took, and small utilities I wrote while exploring problems in NLP and AI alignment.
- Not a collaboration space: I am not accepting external contributions or pull requests. If you want to follow my public work, use the links on my personal site.
- Expect incomplete dependencies and ad-hoc notebooks. When I formalize an experiment I'll add a small README in that folder with environment notes and reproducibility hints.

## Opinionated notes — short-term directions and principles

These items capture where I expect the code and my experiments to head next. They are intentionally opinionated and meant to guide future work in the repo.

- On-device SLMs (small language models) as a priority: focus on privacy-preserving, latency-sensitive workloads. Practical work here will emphasize quantization, sparse or low-rank adaptation, and lightweight runtimes rather than scaling up model size.
- Reproducibility by design: prefer experiments that can be re-run with a deterministic seed, a small pinned environment, and a short script that reproduces the core result.
- Interpretability and alignment tools are core research interests — experiments that shed light on model reasoning, source attribution, or hallucination modes will get prominence.
- Keep the codebase lean: notebooks for discovery, small scripts for reproduction, and a single canonical runner per experiment. Avoid large dependency trees where possible.

## Codebase conventions (how I organise things)

- Each experiment/folder should include a short `README.md` describing: purpose, minimal steps to reproduce, and the Python version used.
- If an experiment is intended to be repeatable, include a `requirements.txt` or a pinned `pyproject.toml` inside that folder.
- Prefer small datasets or subsampled fixtures for the repo; full-scale datasets are tracked externally and referenced with notes about provenance.

## How to use this repo

1. Inspect notebooks for conceptual notes and exploratory code.
2. Look for an experiment-level `README.md` for reproducibility details.
3. Use a virtual environment (Python 3.10+) and pin dependencies locally when you run anything here.

## Notes on data and privacy

Some experiments rely on third-party datasets or APIs. Check each folder's notes for provenance and licensing. Be mindful of privacy and do not assume all artifacts are safe for redistribution.

---

If you'd like a specific folder or experiment documented, point me to it and I'll add a short reproducibility note for that item. This repository is my working journal; it will continue to change as experiments evolve.
