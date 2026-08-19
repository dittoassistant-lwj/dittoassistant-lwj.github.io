# Related Academic Work: Flow Control for Bufferless Ring / Routerless NoC

Generated: 2026-08-19  
Scope: recent and closely related academic work around flow control, traffic modelling, and performance/latency analysis for bufferless or routerless ring-style Network-on-Chip (NoC) designs.


## Quick Comparison Table

| Paper | Year | Link | Closest relevance | Method / evidence | Main difference from your likely report |
|---|---:|---|---|---|---|
| Balanced Flow Control for Routerless Multi-Ring Networks-on-Chip | 2025 | [DOI](https://doi.org/10.1109/EEI67650.2025.11334773) | Closest recent flow-control match for routerless/multi-ring NoCs | Proposed flow-control mechanism + interface microarchitecture; simulation/experimental evaluation | Multi-ring and experimentally driven; not primarily a simple-ring steady-state model |
| Affine-NoC: Multi-ring NoCs exploiting long physical links | 2024 | [DOI](https://doi.org/10.1109/NoCArc64615.2024.10749957), [PDF](https://repositorio.unican.es/xmlui/bitstream/10902/35518/2/AffineNoCMultiring.pdf) | Recent routerless multi-ring topology/fairness work | Topology construction using affine-plane-inspired ring layout | Improves load structurally via topology, not via a flow-control law |
| Traffic Divergence Theory: An Analysis Formalism for Dynamic Networks | 2024 | [DOI](https://doi.org/10.1109/ACCESS.2024.3383436) | Mathematically useful for flow-balance/imbalance language | General traffic-dynamics formalism using divergence-like metrics | Not NoC-specific and not ring-specific |
| Real-Time Guarantees in Routerless Networks-on-Chip | 2023 / 2022 | [DOI](https://doi.org/10.1145/3616539), [arXiv](https://arxiv.org/abs/2209.10430) | Closest analytical routerless-NoC work | Analytical latency upper-bound framework for hard real-time flows | Worst-case latency analysis, not steady-state throughput/fairness equilibrium |
| Routerless networks-on-chip | 2022 | [DOI](https://doi.org/10.1016/bs.adcom.2021.11.002) | Broad routerless-NoC background | Survey/chapter-style architectural overview | Background reference rather than a specific flow-control model |
| Energy-Efficient Deflection-based On-chip Networks: Topology, Routing, Flow Control | 2021 / 2022 | [arXiv](https://arxiv.org/abs/2112.02516) | Strong background on bufferless/deflection NoC design space | Survey/chapter discussion of topology, routing, and flow-control trade-offs | Broad synthesis, not a new simple-ring model |
| Network-Cognitive Traffic Control: A Fluidity-Aware On-Chip Communication | 2020 | [DOI](https://doi.org/10.3390/electronics9101667) | Broader NoC traffic-control context | Traffic-aware/fluidity-aware control perspective | Not clearly bufferless-ring-specific |
| An Approximate Bufferless Network-on-Chip | 2019 | [DOI](https://doi.org/10.1109/ACCESS.2019.2943922) | Related only if approximation/loss is allowed | Approximate bufferless NoC design | Less relevant for lossless flow-control modelling |
| Design and Analysis of Hybrid Flow Control for Hierarchical Ring Network-on-Chip | 2016 | [DOI](https://doi.org/10.1109/TC.2015.2417525) | Direct ring-NoC flow-control foundation | Hybrid flow-control design/analysis for hierarchical rings | Hierarchical and older; may not be purely bufferless/simple-ring |
| A case for hierarchical rings with deflection routing: An energy-efficient on-chip communication substrate | 2016 | [DOI](https://doi.org/10.1016/j.parco.2016.01.009) | Ring + deflection-routing foundation | Architecture/topology evaluation | Deflection-ring architecture, not steady-state flow-control law |
| Design and Evaluation of Hierarchical Rings with Deflection Routing | 2014 | [DOI](https://doi.org/10.1109/SBAC-PAD.2014.31) | Ring + deflection-routing foundation | Hierarchical ring design and evaluation | Architecture-oriented, older, not mainly mathematical flow-control modelling |
| Clumsy Flow Control for High-Throughput Bufferless On-Chip Networks | 2013 | [DOI](https://doi.org/10.1109/L-CA.2012.22) | Foundational bufferless NoC flow-control baseline | Flow-control mechanism for high-throughput bufferless NoCs | Not ring-specific and likely simulation/microarchitecture-focused |
| Throttling Control for Bufferless Routing in On-chip Networks | 2012 | [DOI](https://doi.org/10.1109/MCSOC.2012.25) | Foundational throttling/admission-control baseline | Injection/throttling control for bufferless routing | Older; not simple-ring steady-state analysis |
| Evaluating Bufferless Flow Control for On-chip Networks | 2010 | [DOI](https://doi.org/10.1109/NOCS.2010.10) | Foundational bufferless-flow-control evaluation | Evaluation of bufferless NoC flow-control trade-offs | Older evaluation paper, not recent ring-specific modelling |

---

## Executive Summary

Your colleague's report sounds like it sits in a fairly specific niche: **steady-state mathematical modelling of a proposed flow-control method on a simple bufferless ring NoC**. I found several adjacent lines of published work, but the exact intersection of **ring topology + bufferless/routerless design + flow control + closed-form steady-state analysis** appears sparse in recent publications.

The closest matches are:

- **Balanced Flow Control for Routerless Multi-Ring Networks-on-Chip** (Wen et al., 2025): most directly aligned with recent *flow control for routerless multi-ring NoCs*. It focuses on balancing node service/equality-of-service and improving hotspot fairness. It appears experimentally driven rather than a steady-state queueing/fluid model.
- **Real-Time Guarantees in Routerless Networks-on-Chip** (Indrusiak and Burns, 2023 / arXiv 2022): closest in terms of *analytical framework* for routerless NoCs. It derives latency upper bounds rather than steady-state throughput/fairness equations.
- **Traffic Divergence Theory** (Wang et al., 2024): not NoC-specific, but conceptually relevant because it formalizes flow imbalance using a divergence-like metric. This is potentially useful vocabulary for your steady-state ring analysis.
- **Affine-NoC** (2024): recent routerless multi-ring topology work. Not a flow-control paper, but important because it shows how ring set design/topology can reduce hop count, deflections, and unfairness without adding complex routers.
- **Design and Analysis of Hybrid Flow Control for Hierarchical Ring NoC** (Kim et al., 2016): older but directly about hierarchical ring NoC flow control. This is probably one of the most relevant foundations.
- **Clumsy Flow Control** (Kim et al., 2013), **Throttling Control for Bufferless Routing** (2012), and **Evaluating Bufferless Flow Control** (2010): foundational bufferless-flow-control papers. Not recent, but they are important baselines because later bufferless/routerless NoC work keeps rediscovering the same saturation, fairness, and injection-control issues.

My read: if your proposed method has a clean steady-state model for a bufferless ring, its novelty could plausibly be framed as **bringing analytical tractability to a space where many works rely on simulation**, especially under hotspot/asymmetric traffic where routerless rings suffer fairness collapse.

---

## Search Method

I searched Semantic Scholar, OpenAlex, Crossref, and arXiv-style metadata for combinations of:

- `bufferless ring network on chip flow control mathematical model steady state`
- `routerless ring networks on chip flow control`
- `ring NoC flow control analytical model`
- `bufferless deflection routing network on chip flow control`
- `ring network on chip injection throttling flow control`
- exact-title searches for known bufferless/routerless NoC papers

Note: several relevant IEEE/ACM papers have closed full text. The summaries below are based on publisher metadata, abstracts where available, and the known positioning of these papers from their titles/venues/metadata. For formal citation or claim-level comparison, I would still verify PDFs where you have institutional access.

---

## Paper Summaries and Analysis

### 1. Balanced Flow Control for Routerless Multi-Ring Networks-on-Chip

**Citation metadata**

- Authors: K. Wen, Wendong Liu, Jianfei Jiang, Naifeng Jing, Weiguang Shen, Qin Wang
- Year: 2025
- Venue: 2025 7th International Conference on Electronic Engineering and Informatics (EEI)
- DOI: https://doi.org/10.1109/EEI67650.2025.11334773

**What it studies**

This is the most directly relevant recent paper I found. It targets **routerless multi-ring NoCs**, where complex routers and arbitration are removed to save area/power. The paper observes that prior routerless NoC work focused heavily on topology optimization while under-addressing **flow control** and fairness/equality-of-service across nodes.

The proposed mechanism, called **Balanced RL** in the abstract, is a flow-control method plus interface microarchitecture. The reported results include:

- +12.35% throughput under symmetric traffic.
- Near-uniform throughput distribution under hotspot traffic.
- Up to 8× throughput improvement for bottleneck nodes compared with baseline designs.

**Relation to your work**

Strong conceptual overlap:

- Ring/routerless NoC setting.
- Flow-control mechanism rather than only routing/topology.
- Fairness and hotspot behavior.
- Balancing node access to a shared ring/multi-ring resource.

Important difference:

- The public metadata suggests an **experimental/simulation evaluation**, not a closed-form or steady-state mathematical model.
- It is multi-ring/routerless rather than a minimal simple single ring.

**How to use it in your related work**

This is likely the first paper to cite in the “recent routerless ring flow control” bucket. Your framing can be:

> Recent routerless multi-ring work recognizes flow control as a first-order design problem and proposes balancing mechanisms to improve fairness and hotspot throughput. In contrast, our work focuses on a simpler bufferless ring abstraction and derives a steady-state model that explains when and why the flow-control mechanism stabilizes or saturates.

**What to compare against**

- Throughput fairness across ring nodes.
- Hotspot/bottleneck improvement.
- Symmetric vs asymmetric traffic.
- Whether your model predicts the same qualitative behavior: load spreading, starvation prevention, and bottleneck service equalization.

---

### 2. Real-Time Guarantees in Routerless Networks-on-Chip

**Citation metadata**

- Authors: Leandro Soares Indrusiak, Alan Burns
- Year: arXiv 2022; journal version in ACM Transactions on Embedded Computing Systems, 2023
- arXiv: https://arxiv.org/abs/2209.10430
- DOI: https://doi.org/10.1145/3616539

**What it studies**

This paper analyzes routerless NoCs from a **hard real-time** perspective. It develops an analytical framework to provide **latency upper bounds** for real-time packet flows over routerless NoCs, then compares different routerless architectures against a wormhole NoC with priority-preemptive routers.

The core angle is not average steady-state throughput, but worst-case latency and schedulability.

**Relation to your work**

Strong analytical-method overlap:

- Routerless NoC.
- Mathematical/analytical framework.
- Flow interaction under constrained on-chip interconnect.

Different objective:

- Their target is **upper-bounded latency for real-time flows**.
- Your colleague's report sounds like **steady-state behavior**: service rates, equilibrium occupancy/traffic, stable throughput, or fairness on a simple bufferless ring.

**Why it matters**

This paper gives you a way to position your model:

- Worst-case analysis answers: “Can any packet miss a deadline?”
- Steady-state modelling answers: “What operating point does the flow-control loop converge to under offered load?”

These are complementary. In NoC research, this distinction is useful because simulation-only papers often blur latency, throughput, and fairness into a single performance story.

**Possible citation framing**

> Analytical studies of routerless NoCs have mainly focused on worst-case latency and real-time guarantees. Our work instead models steady-state flow-control behavior under bufferless ring constraints, exposing equilibrium throughput/fairness conditions.

---

### 3. Affine-NoC: Multi-ring NoCs Exploiting Long Physical Links

**Citation metadata**

- Authors: not fully checked from metadata in this pass
- Year: 2024
- Venue: 17th IEEE/ACM International Workshop on Network on Chip Architectures (NoCArc), 2024
- DOI: https://doi.org/10.1109/NoCArc64615.2024.10749957
- Open PDF found via OpenAlex metadata: https://repositorio.unican.es/xmlui/bitstream/10902/35518/2/AffineNoCMultiring.pdf

**What it studies**

Affine-NoC is a routerless multi-ring NoC topology. It uses a ring arrangement derived from affine-plane structure and long physical links to produce a more balanced multi-ring design. The abstract reports:

- Balanced ring layout.
- Lower average distance and diameter.
- Similar aggregate link-length cost to previous routerless multi-ring proposals.
- Simplified multiplexing units.
- 76% hop-count reduction and 20.5% average-latency reduction compared with previous designs.
- 27% deflection reduction and improved fairness.

**Relation to your work**

This is not a flow-control paper, but it is relevant because in bufferless/routerless ring NoCs, **topology and flow control are coupled**:

- A better topology reduces offered load per ring segment.
- Fewer deflections reduce circulating load.
- Lower hop count changes the steady-state traffic intensity because packets occupy ring resources for fewer cycles.

If your model assumes a simple ring, Affine-NoC is useful as a contrast:

- Your model isolates the control law in the simplest topology.
- Affine-NoC improves behavior structurally, by changing path length and ring membership.

**Practical implication**

If your flow-control method generalizes beyond a simple ring, one good next step is to test whether the same steady-state equations can be parameterized by:

- Mean path length.
- Ring/link participation count.
- Injection eligibility per node.
- Deflection probability.

That would bridge your model to modern routerless multi-ring topologies.

---

### 4. Traffic Divergence Theory: An Analysis Formalism for Dynamic Networks

**Citation metadata**

- Year: 2024
- Venue: IEEE Access
- DOI: https://doi.org/10.1109/ACCESS.2024.3383436
- Open PDF metadata: https://ieeexplore.ieee.org/ielx7/6287639/6514899/10486899.pdf

**What it studies**

This paper proposes a general analytical formalism for network traffic dynamics using a notion of **traffic divergence**, capturing flow imbalance at nodes and links. It introduces probes for spatial and temporal traffic dynamics, including a spatial divergence rate that characterizes relative differences among node traffic divergence. It demonstrates the theory on throughput estimation for datacenter networks and power-optimized robot communication planning.

**Relation to your work**

This is not a NoC/ring paper, but it is mathematically adjacent. A steady-state bufferless ring model is fundamentally about conservation and imbalance:

- Injected traffic enters the ring.
- Delivered traffic exits at destinations.
- In-flight/circulating traffic consumes link slots.
- Flow control changes admission so the ring does not become dominated by non-deliverable or unfair traffic.

Traffic divergence provides vocabulary for this:

- At equilibrium, per-node/link divergence should satisfy conservation constraints.
- Hotspots induce positive/negative divergence imbalance.
- Flow control can be interpreted as shaping divergence so no node/link becomes a persistent sink/source imbalance.

**Useful idea to borrow**

You could define a ring-specific divergence term:

```text
D_i = injection_i + transit_in_i - delivery_i - transit_out_i
```

In a lossless steady state, the long-run average should satisfy something like `E[D_i] = 0`, but the **control law** determines whether the system reaches a fair equilibrium or a pathological one where one node's injection is persistently suppressed.

This may help make your colleague's Chinese mathematical report sound more connected to broader network-analysis literature.

---

### 5. Network-Cognitive Traffic Control: A Fluidity-Aware On-Chip Communication

**Citation metadata**

- Year: 2020
- Venue: Electronics
- DOI: https://doi.org/10.3390/electronics9101667

**What it studies**

This paper proposes a traffic-control perspective for NoCs using a “fluidity-aware” view of communication. From the title/metadata, the focus is likely on using network state/traffic awareness to control communication behavior in the NoC.

**Relation to your work**

Moderate relevance:

- It treats NoC traffic as something to be controlled dynamically rather than only routed.
- “Fluidity-aware” language may overlap with a fluid/steady-state model.
- It may provide prior art for control-theoretic or traffic-state-aware NoC mechanisms.

Caveat:

- I did not verify that it specifically uses bufferless ring topology.
- It may be more general NoC traffic management than ring-specific flow control.

**How to use it**

Use as broader context, not as the closest baseline:

> Traffic-aware and fluidity-aware NoC control schemes have been proposed for adaptive on-chip communication. Our work differs by focusing on the analytically tractable bufferless ring case and deriving steady-state behavior of the control rule.

---

### 6. Energy-Efficient Deflection-based On-chip Networks: Topology, Routing, Flow Control

**Citation metadata**

- Authors: Rachata Ausavarungnirun, Onur Mutlu
- Year: 2021 / arXiv version 2021, updated 2022
- arXiv: https://arxiv.org/abs/2112.02516

**What it studies**

This is a survey/chapter-style work on energy-efficient deflection-based on-chip networks. It discusses:

- Bufferless router designs that remove input buffers to save energy.
- Deflection routing as the mechanism for resolving port contention.
- Degradation under high network load.
- Minimally-buffered designs that reduce deflections.
- Hierarchical bufferless interconnects that reduce hop count.
- Trade-offs across topology, routing, and flow control.

**Relation to your work**

High background relevance:

- It names the exact system-level problem: bufferless NoCs work well at low load but degrade at high load.
- It frames flow control as one of the main levers, alongside topology and routing.
- It can help position why a simple steady-state model is useful: it explains the saturation regime rather than only measuring it.

**Possible use in your paper/report**

Use it in the introduction/background:

> Bufferless/deflection-based NoCs reduce router energy by eliminating input buffers, but high load can cause excessive deflections, throughput collapse, and unfairness. Existing work has proposed minimally buffered or hierarchical designs; our work studies a flow-control rule in a simpler ring setting to expose the steady-state mechanism.

---

### 7. Design and Analysis of Hybrid Flow Control for Hierarchical Ring Network-on-Chip

**Citation metadata**

- Authors: H. Kim, Gwangsun Kim, H. Yeo, John Kim, S. Maeng
- Year: 2016
- Venue: IEEE Transactions on Computers
- DOI: https://doi.org/10.1109/TC.2015.2417525

**What it studies**

This paper directly addresses **flow control in hierarchical ring NoCs**. Although older than the “recent years” window, it is highly relevant because it combines:

- Ring topology.
- Hierarchical organization.
- Flow-control design and analysis.

The title suggests a hybrid mechanism, likely combining different flow-control methods at different hierarchy levels or under different traffic conditions.

**Relation to your work**

Very strong topological relevance, but likely different abstraction:

- Hierarchical ring vs simple ring.
- Possibly buffered/hybrid vs purely bufferless.
- Design/evaluation analysis rather than simple steady-state math.

**How to use it**

This should be treated as a foundational related-work anchor for ring NoC flow control:

> Hierarchical ring NoCs have previously used hybrid flow control to improve throughput/latency trade-offs. Our work differs by considering a minimal bufferless ring and deriving the steady-state behavior of a specific control law, which can later be extended to hierarchical/multi-ring settings.

---

### 8. Design and Evaluation of Hierarchical Rings with Deflection Routing / A Case for Hierarchical Rings with Deflection Routing

**Citation metadata**

- Design and Evaluation of Hierarchical Rings with Deflection Routing
  - Year: 2014
  - Venue: IEEE SBAC-PAD 2014
  - DOI: https://doi.org/10.1109/SBAC-PAD.2014.31
- A case for hierarchical rings with deflection routing: An energy-efficient on-chip communication substrate
  - Year: 2016
  - Venue: Parallel Computing
  - DOI: https://doi.org/10.1016/j.parco.2016.01.009

**What it studies**

This line of work argues for hierarchical rings with deflection routing as an energy-efficient NoC substrate. Deflection routing is closely related to bufferless design because packets are not blocked on contention; they are misrouted/deflected and continue moving.

**Relation to your work**

Strong background relevance:

- Ring structure.
- Deflection/bufferless-like behavior.
- Energy-efficient on-chip communication.
- Potential unfairness or saturation due to circulating traffic.

Different focus:

- Primarily architecture/topology and evaluation.
- Not mainly a flow-control steady-state model.

**Why it matters**

A simple bufferless ring model should probably be checked against deflection-ring behavior because deflection creates an important feedback loop:

```text
higher load -> more contention/deflection -> longer packet residence time -> higher effective load -> more contention
```

Flow control usually tries to break this positive feedback loop by throttling injection or balancing access before the ring enters the unstable/saturated regime.

---

### 9. Clumsy Flow Control for High-Throughput Bufferless On-Chip Networks

**Citation metadata**

- Authors: H. Kim, Yonggon Kim, John Kim
- Year: 2013
- Venue: IEEE Computer Architecture Letters
- DOI: https://doi.org/10.1109/L-CA.2012.22

**What it studies**

This paper proposes **Clumsy Flow Control (CFC)** for bufferless NoCs. The key premise is that bufferless networks can suffer badly at high load, and some form of flow control/admission management is needed to recover throughput.

**Relation to your work**

Very relevant as a foundational flow-control baseline:

- Bufferless NoC.
- High-throughput workload regime.
- Flow-control mechanism to avoid collapse.

Differences:

- It is not specifically a simple ring model.
- It is older and likely evaluated with simulation.
- The mechanism may be heuristic/microarchitectural rather than analytically modelled.

**How to use it**

This is the baseline family your work should explicitly distinguish from:

> Prior bufferless NoC flow-control mechanisms throttle or regulate injection to improve throughput under high load. Our contribution is a steady-state model for a ring setting, clarifying the equilibrium conditions under which throttling/balancing succeeds.

---

### 10. Throttling Control for Bufferless Routing in On-chip Networks

**Citation metadata**

- Year: 2012
- Venue: IEEE MCSoC 2012
- DOI: https://doi.org/10.1109/MCSOC.2012.25

**What it studies**

This paper is about throttling control for bufferless routing. The idea is likely injection throttling: reducing packet injection when the network is congested to avoid excessive deflection/circulating load.

**Relation to your work**

Important baseline if your flow-control method includes any of:

- Source throttling.
- Admission control.
- Ring-slot gating.
- Per-node rate limiting.
- Credit/permit-like injection control.

**Analytical connection**

In a simple ring steady-state model, throttling naturally appears as a control variable:

```text
accepted_injection_i = min(offered_load_i, allowed_rate_i(state))
```

The core question becomes whether `allowed_rate_i` converges to a fair/stable allocation under asymmetric destinations or hotspot traffic.

---

### 11. Evaluating Bufferless Flow Control for On-chip Networks

**Citation metadata**

- Authors: George Michelogiannakis, Daniel Sánchez, William J. Dally, Christos Kozyrakis
- Year: 2010
- Venue: ACM/IEEE NoCS 2010
- DOI: https://doi.org/10.1109/NOCS.2010.10

**What it studies**

This is one of the classic bufferless NoC flow-control evaluation papers. It predates the recent routerless multi-ring work but is still important because it evaluates the basic trade-off of removing buffers and using flow-control/routing mechanisms to maintain performance.

**Relation to your work**

Useful as a foundational reference:

- Establishes bufferless flow control as a known problem.
- Helps motivate why bufferless designs need explicit admission/control logic.
- Provides historical baseline terminology.

**How to use it**

Cite it as background rather than direct recent competitor:

> Bufferless NoC flow control has been studied for over a decade; however, much of the prior work evaluates architectural mechanisms via simulation. Recent routerless ring proposals revive the need for analytically grounded flow-control models.

---

### 12. An Approximate Bufferless Network-on-Chip

**Citation metadata**

- Year: 2019
- Venue: IEEE Access
- DOI: https://doi.org/10.1109/ACCESS.2019.2943922

**What it studies**

Approximate bufferless NoCs trade exact delivery/precision requirements against performance/energy benefits. This is less directly related unless your flow-control method tolerates drops, approximation, or lossy delivery.

**Relation to your work**

Low-to-moderate relevance:

- Bufferless NoC setting.
- Potentially relevant if the proposed method sacrifices some packets, precision, or ordering.
- Otherwise not a core related-work item.

---

## Thematic Comparison

### A. Topology-centric routerless ring work

Representative papers:

- Affine-NoC (2024)
- Hierarchical rings with deflection routing (2014/2016)
- Routerless NoC survey/chapter (2022)

Core idea:

- Simplify routers by using rings or multi-rings.
- Improve performance by reducing hop count, diameter, and deflections.
- Fairness improves when topology balances path lengths and ring usage.

Relation to your method:

- Your flow control could be orthogonal: topology reduces structural load; flow control manages dynamic load.
- A clean simple-ring steady-state model can become a building block for multi-ring analysis.

### B. Flow-control / throttling-centric bufferless NoC work

Representative papers:

- Balanced Flow Control for Routerless Multi-Ring NoCs (2025)
- Clumsy Flow Control (2013)
- Throttling Control for Bufferless Routing (2012)
- Evaluating Bufferless Flow Control (2010)

Core idea:

- Bufferless networks degrade at high injection rates.
- Deflection or circulation increases packet residence time.
- Flow control regulates injection/access to avoid throughput collapse or unfairness.

Relation to your method:

- This is the closest competitor family.
- Your differentiator is mathematical steady-state characterization on a simple ring.

### C. Analytical / formal modelling work

Representative papers:

- Real-Time Guarantees in Routerless NoCs (2023)
- Traffic Divergence Theory (2024)

Core idea:

- Use mathematical frameworks to reason about latency, flow imbalance, or traffic dynamics.
- Provide guarantees or explanatory models beyond simulation.

Relation to your method:

- This is where your report likely contributes most: not just another microarchitecture, but a model that explains equilibrium behavior.

---

## Suggested Positioning for Your Work

A possible related-work framing:

> Bufferless and routerless NoCs reduce area and energy by removing router buffers and arbitration-heavy switching, but this shifts the design challenge to flow control. Prior work has shown that bufferless networks can suffer from throughput collapse, unfairness, and excessive deflections under high load, motivating throttling and balanced admission mechanisms. Recent routerless multi-ring proposals further highlight equality-of-service and hotspot fairness as central concerns. However, most existing work evaluates these mechanisms through simulation or focuses on topology construction and worst-case latency bounds. We study a minimal bufferless ring model and derive the steady-state behavior of a proposed flow-control method, exposing the equilibrium conditions for stability, throughput, and fairness.

This positioning is defensible because it cleanly separates:

- **Architecture papers**: topology/microarchitecture.
- **Control papers**: throttling/balancing mechanisms.
- **Analytical papers**: formal bounds or traffic dynamics.
- **Your work**: steady-state model of a specific control law in a tractable bufferless ring.

---

## What I Would Look for in the Chinese HTML Report

Since I have not read the HTML report itself, I would check whether the model contains these elements:

1. **State variable**
   - Number/fraction of occupied ring slots?
   - Per-node accepted injection rate?
   - Per-destination circulating traffic?
   - Per-node blocking/throttling probability?

2. **Conservation equation**
   - In steady state, long-run injection equals long-run delivery for each flow, unless drops exist.
   - Ring occupancy should equal arrival rate times residence time, Little's-law style.

3. **Residence time model**
   - For a ring, packet lifetime depends on source-destination distance and whether it misses delivery opportunities.
   - Under bufferless constraints, contention can increase effective residence time.

4. **Control law**
   - Is injection gated by local ring occupancy, downstream availability, token/credit, or measured service rate?
   - Does the control act per-node, per-flow, or globally?

5. **Equilibrium and stability**
   - Does the model prove uniqueness of equilibrium?
   - Does it show convergence or only solve fixed points?
   - Are there multiple equilibria under asymmetric traffic?

6. **Fairness metric**
   - Max-min fairness?
   - Jain's fairness index?
   - Equal service opportunity?
   - Hotspot receiver fairness?

7. **Saturation point**
   - Does the model predict the offered load at which uncontrolled injection becomes unstable or unfair?
   - Does the proposed control move the knee of the throughput-latency curve or merely redistribute throughput?

If the report answers these, it is likely stronger than much of the simulation-heavy related work.

---

## Recommended Next Experiments / Checks

To make the modelling more publishable, I would run these checks against a simulator:

1. **Single-ring uniform random traffic**
   - Validate predicted occupancy and throughput vs offered load.
   - Check low-load linear regime and high-load saturation regime.

2. **Single hotspot destination**
   - Measure whether the control law equalizes source rates or starves far/near nodes.
   - Compare with Balanced Flow Control's hotspot fairness motivation.

3. **Asymmetric source rates**
   - Test whether equilibrium follows offered load proportionally or enforces equal shares.

4. **Different ring sizes**
   - Check if model scales with `N`, mean source-destination distance, and ring capacity.

5. **Perturbation/stability test**
   - Start from overloaded occupancy and see if control returns to predicted fixed point.
   - Start from empty ring and compare convergence time.

6. **Compare against simple throttling baselines**
   - Static per-node rate cap.
   - Occupancy-threshold gating.
   - Token/credit-based admission.
   - No flow control.

7. **Sensitivity to non-ideal assumptions**
   - Non-uniform packet sizes.
   - Bursty injection.
   - Imperfect/lagged congestion signal.
   - Multiple virtual rings or bidirectional rings.

---

## Short Bibliography

- Wen, K., Liu, W., Jiang, J., Jing, N., Shen, W., Wang, Q. **Balanced Flow Control for Routerless Multi-Ring Networks-on-Chip**. EEI 2025. DOI: https://doi.org/10.1109/EEI67650.2025.11334773
- Indrusiak, L. S., Burns, A. **Real-Time Guarantees in Routerless Networks-on-Chip**. ACM TECS 2023; arXiv 2022. DOI: https://doi.org/10.1145/3616539; arXiv: https://arxiv.org/abs/2209.10430
- **Routerless networks-on-chip**. Advances in Computers, 2022. DOI: https://doi.org/10.1016/bs.adcom.2021.11.002
- **Affine-NoC: Multi-ring NoCs exploiting long physical links**. NoCArc 2024. DOI: https://doi.org/10.1109/NoCArc64615.2024.10749957
- **Traffic Divergence Theory: An Analysis Formalism for Dynamic Networks**. IEEE Access 2024. DOI: https://doi.org/10.1109/ACCESS.2024.3383436
- Ausavarungnirun, R., Mutlu, O. **Energy-Efficient Deflection-based On-chip Networks: Topology, Routing, Flow Control**. arXiv 2021/2022. https://arxiv.org/abs/2112.02516
- **Network-Cognitive Traffic Control: A Fluidity-Aware On-Chip Communication**. Electronics 2020. DOI: https://doi.org/10.3390/electronics9101667
- Kim, H., Kim, G., Yeo, H., Kim, J., Maeng, S. **Design and Analysis of Hybrid Flow Control for Hierarchical Ring Network-on-Chip**. IEEE Transactions on Computers, 2016. DOI: https://doi.org/10.1109/TC.2015.2417525
- **Design and Evaluation of Hierarchical Rings with Deflection Routing**. IEEE SBAC-PAD 2014. DOI: https://doi.org/10.1109/SBAC-PAD.2014.31
- **A case for hierarchical rings with deflection routing: An energy-efficient on-chip communication substrate**. Parallel Computing 2016. DOI: https://doi.org/10.1016/j.parco.2016.01.009
- Kim, H., Kim, Y., Kim, J. **Clumsy Flow Control for High-Throughput Bufferless On-Chip Networks**. IEEE Computer Architecture Letters, 2013. DOI: https://doi.org/10.1109/L-CA.2012.22
- **Throttling Control for Bufferless Routing in On-chip Networks**. IEEE MCSoC 2012. DOI: https://doi.org/10.1109/MCSOC.2012.25
- Michelogiannakis, G., Sánchez, D., Dally, W. J., Kozyrakis, C. **Evaluating Bufferless Flow Control for On-chip Networks**. ACM/IEEE NoCS 2010. DOI: https://doi.org/10.1109/NOCS.2010.10

---

## Bottom Line

The closest recent direct prior art is **Balanced Flow Control for Routerless Multi-Ring Networks-on-Chip (2025)**. The closest analytical prior art is **Real-Time Guarantees in Routerless Networks-on-Chip (2023)**, though it studies worst-case latency rather than steady-state equilibrium. The older bufferless-flow-control papers are still essential because they define the congestion-collapse/throttling problem that your simple-ring model likely explains.

If your proposed method has a compact model that predicts throughput/fairness/stability under simple bufferless ring assumptions, I would position it as:

> an analytically grounded flow-control model for bufferless rings, bridging simulation-heavy bufferless NoC flow-control work and recent routerless multi-ring fairness mechanisms.
