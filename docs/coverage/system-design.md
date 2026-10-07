# System Design: roadmap.sh coverage

Roadmap: [roadmap.sh/system-design](https://roadmap.sh/system-design), topic list fetched 2026-10-07 from the open-source roadmap repository. Audited 2026-10-07.

The roadmap has 147 topic nodes. Some appear more than once under different parents, and two pairs are the same pattern under two names (pipes and filters; scheduler agent supervisor), so this audit tracks **130 distinct topics**. 8 are headings or intro text with nothing to test, leaving **122 in scope**.

Coverage % = (covered + 0.5 × partial) ÷ in-scope topics.

| | Before the audit | After the gap fill |
|---|---|---|
| Covered | 85 | 122 |
| Partial | 18 | 0 |
| Missing | 19 | 0 |
| Out of scope | 8 | 8 |
| **Coverage** | **77.0%** | **100.0%** |
| Questions in bank | 450 | 487 |

A topic counts as covered when at least two solid items, or one item that tests it in depth, target it. The question IDs listed are representative, not exhaustive.

| Topic | Status | Questions | Notes |
|---|---|---|---|
| Ambassador | covered (was missing) | SD-GAP-001 | Gap filled by SD-GAP-001 |
| Anti corruption layer | covered (was missing) | SD-GAP-002 | Gap filled by SD-GAP-002 |
| Busy database | covered (was missing) | SD-GAP-003 | Gap filled by SD-GAP-003 |
| Busy frontend | covered (was missing) | SD-GAP-004 | Gap filled by SD-GAP-004 |
| Choreography | covered (was missing) | SD-GAP-005 | Gap filled by SD-GAP-005 |
| Claim check | covered (was missing) | SD-GAP-006 | Gap filled by SD-GAP-006 |
| Compute resource consolidation | covered (was missing) | SD-GAP-007 | Gap filled by SD-GAP-007 |
| Federation | covered (was missing) | SD-GAP-008 | Gap filled by SD-GAP-008 |
| Gatekeeper | covered (was missing) | SD-GAP-009 | Gap filled by SD-GAP-009 |
| Improper instantiation | covered (was missing) | SD-GAP-010 | Gap filled by SD-GAP-010 |
| Monolithic persistence | covered (was missing) | SD-GAP-011 | Gap filled by SD-GAP-011 |
| No caching | covered (was missing) | SD-GAP-012 | Gap filled by SD-GAP-012 |
| Pipes and filters | covered (was missing) | SD-GAP-013 | Gap filled by SD-GAP-013 |
| Scheduler agent supervisor | covered (was missing) | SD-GAP-014 | Gap filled by SD-GAP-014 |
| Security monitoring | covered (was missing) | SD-GAP-015 | Gap filled by SD-GAP-015 |
| Strangler fig | covered (was missing) | SD-GAP-016 | Gap filled by SD-GAP-016 |
| Synchronous io | covered (was missing) | SD-GAP-017 | Gap filled by SD-GAP-017 |
| Usage monitoring | covered (was missing) | SD-GAP-018 | Gap filled by SD-GAP-018 |
| Web server caching | covered (was missing) | SD-GAP-019 | Gap filled by SD-GAP-019 |
| Application layer | covered (was partial) | SD-SCL-017, SD-GAP-020 | Gap filled by SD-GAP-020 |
| Availability monitoring | covered (was partial) | SD-REL-009, SD-GAP-021 | Gap filled by SD-GAP-021 |
| Back pressure | covered (was partial) | SD-REL-008, SD-REL-043, SD-GAP-022 | Gap filled by SD-GAP-022 |
| Cqrs | covered (was partial) | SD-MSG-041, SD-GAP-023 | Gap filled by SD-GAP-023 |
| Database caching | covered (was partial) | SD-CAC-001, SD-GAP-024 | Gap filled by SD-GAP-024 |
| Document store | covered (was partial) | SD-DAT-018, SD-GAP-025 | Gap filled by SD-GAP-025 |
| External config store | covered (was partial) | SD-REL-017, SD-GAP-026 | Gap filled by SD-GAP-026 |
| Extraneous fetching | covered (was partial) | SD-DAT-008, SD-GAP-027 | Gap filled by SD-GAP-027 |
| Gateway aggregation | covered (was partial) | SD-API-040, SD-GAP-028 | Gap filled by SD-GAP-028 |
| Materialized view | covered (was partial) | SD-REP-033, SD-GAP-029 | Gap filled by SD-GAP-029 |
| Priority queue | covered (was partial) | SD-REL-043, SD-GAP-030 | Gap filled by SD-GAP-030 |
| Pull cdns | covered (was partial) | SD-CAS-030, SD-GAP-031 | Gap filled by SD-GAP-031 |
| Push cdns | covered (was partial) | SD-CAS-013, SD-GAP-032 | Gap filled by SD-GAP-032 |
| Sidecar | covered (was partial) | SD-SCL-017, SD-GAP-033 | Gap filled by SD-GAP-033 |
| Sql vs nosql | covered (was partial) | SD-DAT-018, SD-GAP-034 | Gap filled by SD-GAP-034 |
| Udp | covered (was partial) | SD-API-033, SD-GAP-035 | Gap filled by SD-GAP-035 |
| Weak consistency | covered (was partial) | SD-MSG-017, SD-GAP-036 | Gap filled by SD-GAP-036 |
| Write behind | covered (was partial) | SD-CAC-003, SD-GAP-037 | Gap filled by SD-GAP-037 |
| Application caching | covered | SD-CAC-010, SD-CAC-033, SD-CAC-036 |  |
| Async request reply | covered | SD-API-001 |  |
| Asynchronism | covered | SD-MSG-011, SD-MSG-005, SD-API-001 |  |
| Availability | covered | SD-REL-002, SD-REL-003, SD-EST-008 |  |
| Availability in numbers | covered | SD-REL-002, SD-REL-003, SD-EST-008, SD-REL-009 |  |
| Availability patterns | covered | SD-REL-013, SD-REL-014, SD-REL-045, SD-REP-020 |  |
| Availability vs consistency | covered | SD-REP-010, SD-REP-011 |  |
| Backends for frontend | covered | SD-API-040 |  |
| Background jobs | covered | SD-CAS-036, SD-CRD-024, SD-MSG-040 |  |
| Bulkhead | covered | SD-REL-024, SD-REL-004 |  |
| Cache aside | covered | SD-CAC-001, SD-CAC-005, SD-CAC-006 |  |
| Caching | covered | SD-CAC-001, SD-CAC-003, SD-CAC-009 |  |
| Cap theorem | covered | SD-REP-010, SD-REP-011 |  |
| Cdn caching | covered | SD-CAC-008, SD-CAC-011, SD-CAC-037 |  |
| Chatty io | covered | SD-API-007, SD-API-040 |  |
| Circuit breaker | covered | SD-REL-019, SD-REL-042, SD-REL-004 |  |
| Client caching | covered | SD-CAC-011, SD-CAC-024, SD-SCL-013 |  |
| Communication | covered | SD-API-005, SD-API-033, SD-SCL-023 |  |
| Compensating transaction | covered | SD-CRD-017, SD-CRD-025, SD-CRD-044 |  |
| Competing consumers | covered | SD-MSG-002, SD-MSG-012, SD-MSG-018 |  |
| Consistency patterns | covered | SD-REP-005, SD-REP-019, SD-CRD-039 |  |
| Content delivery networks | covered | SD-CAC-008, SD-SCL-013, SD-CAS-030 |  |
| Databases | covered | SD-DAT-018, SD-DAT-003, SD-DAT-011 |  |
| Denormalization | covered | SD-DAT-014, SD-DAT-028 |  |
| Deployment stamps | covered | SD-REL-041, SD-REL-033 |  |
| Domain name system | covered | SD-SCL-012, SD-SCL-015, SD-SCL-024 |  |
| Event driven | covered | SD-MSG-005, SD-MSG-014 |  |
| Event sourcing | covered | SD-MSG-028, SD-MSG-041, SD-CAS-022 |  |
| Eventual consistency | covered | SD-REP-019, SD-DAT-006, SD-REP-044 |  |
| Fail over | covered | SD-REL-013, SD-REP-020, SD-REL-045 |  |
| Federated identity | covered | SD-API-024, SD-API-026 |  |
| Gateway offloading | covered | SD-API-019, SD-SCL-011 |  |
| Gateway routing | covered | SD-API-019, SD-SCL-017 |  |
| Geodes | covered | SD-SCL-031, SD-SCL-039 |  |
| Graph databases | covered | SD-DAT-011, SD-DAT-018 |  |
| Graphql | covered | SD-API-007, SD-API-034, SD-API-042 |  |
| Grpc | covered | SD-API-025, SD-API-035, SD-SCL-023 |  |
| Health endpoint monitoring | covered | SD-REL-027, SD-SCL-029, SD-SCL-033 |  |
| Health monitoring | covered | SD-REL-027, SD-SCL-029 |  |
| High availability | covered | SD-REL-029, SD-REL-037, SD-EST-008 |  |
| Horizontal scaling | covered | SD-SCL-001, SD-SCL-019 |  |
| Http | covered | SD-API-004, SD-API-011, SD-API-033 |  |
| Idempotent operations | covered | SD-API-002, SD-API-006, SD-MSG-004 |  |
| Index table | covered | SD-DAT-006, SD-DAT-042, SD-DAT-009 |  |
| Instrumentation | covered | SD-REL-032, SD-REL-039, SD-CAS-028 |  |
| Key value store | covered | SD-DAT-018, SD-DAT-007, SD-CAC-010 |  |
| Latency vs throughput | covered | SD-EST-005, SD-EST-032 |  |
| Layer 4 load balancing | covered | SD-SCL-003, SD-SCL-023 |  |
| Layer 7 load balancing | covered | SD-SCL-003, SD-API-032 |  |
| Lb vs reverse proxy | covered | SD-SCL-011 |  |
| Leader election | covered | SD-CRD-007, SD-CRD-024, SD-CRD-014 |  |
| Load balancers | covered | SD-SCL-003, SD-SCL-004, SD-SCL-005 |  |
| Load balancing algorithms | covered | SD-SCL-004, SD-SCL-009, SD-SCL-033 |  |
| Message queues | covered | SD-MSG-011, SD-MSG-017, SD-MSG-020 |  |
| Messaging | covered | SD-MSG-001, SD-MSG-002, SD-MSG-007 |  |
| Microservices | covered | SD-SCL-026, SD-API-019 |  |
| Monitoring | covered | SD-REL-009, SD-REL-025, SD-REL-032 |  |
| Noisy neighbor | covered | SD-DAT-039, SD-REL-033 |  |
| Performance monitoring | covered | SD-EST-009, SD-REL-032 |  |
| Performance vs scalability | covered | SD-SCL-010 |  |
| Publishersubscriber | covered | SD-CAS-006, SD-CAS-014, SD-CAC-021 |  |
| Queue based load leveling | covered | SD-MSG-011, SD-EST-032 |  |
| Refresh ahead | covered | SD-CAC-009 |  |
| Replication | covered | SD-REP-001, SD-REP-003, SD-REP-017 |  |
| Resiliency | covered | SD-REL-004, SD-REL-024, SD-REL-042 |  |
| Rest | covered | SD-API-004, SD-API-011, SD-API-020 |  |
| Retry | covered | SD-REL-001, SD-REL-006, SD-REL-010 |  |
| Retry storm | covered | SD-REL-006, SD-REL-007 |  |
| Returning results | covered | SD-API-001, SD-API-008 |  |
| Rpc | covered | SD-API-025, SD-API-035 |  |
| Schedule driven | covered | SD-CRD-024, SD-CAS-036, SD-MSG-040 |  |
| Security | covered | SD-API-024, SD-API-026, SD-API-037 |  |
| Sequential convoy | covered | SD-MSG-010, SD-MSG-008, SD-CAS-010 |  |
| Service discovery | covered | SD-CRD-018, SD-CRD-014 |  |
| Sharding | covered | SD-DAT-004, SD-DAT-005, SD-DAT-009 |  |
| Sql tuning | covered | SD-DAT-001, SD-DAT-008, SD-DAT-043 |  |
| Static content hosting | covered | SD-CAS-013, SD-SCL-013, SD-DAT-013 |  |
| Strong consistency | covered | SD-REP-005, SD-CRD-039 |  |
| Task queues | covered | SD-MSG-011, SD-MSG-040 |  |
| Tcp | covered | SD-SCL-018, SD-SCL-023 |  |
| Throttling | covered | SD-REL-005, SD-API-015, SD-CRD-035 |  |
| Valet key | covered | SD-API-018, SD-API-036 |  |
| Visualization & alerts | covered | SD-REL-009, SD-REL-025 |  |
| Wide column store | covered | SD-DAT-010, SD-DAT-018, SD-DAT-029 |  |
| Write through | covered | SD-CAC-002, SD-CAC-032 |  |
| Cloud design patterns | out of scope |  | Group heading; its child patterns are tracked individually |
| Data management | out of scope |  | Group heading; child patterns tracked individually |
| Design & implementation | out of scope |  | Group heading; child patterns tracked individually |
| How to approach system design | out of scope |  | Interview-process advice, not a technical topic |
| Introduction | out of scope |  | Roadmap heading/intro text, no testable content of its own |
| Performance antipatterns | out of scope |  | Group heading; its child antipatterns are tracked individually |
| Reliability patterns | out of scope |  | Group heading; child patterns tracked individually |
| What is system design | out of scope |  | Intro text |

## Gaps filled

37 questions in `content/exams/system-design/questions/roadmap-gaps.json`:

| ID | Topic | Skill | Level |
|---|---|---|---|
| SD-GAP-001 | Ambassador | scaling-basics | Advanced |
| SD-GAP-002 | Anti corruption layer | api-design | Advanced |
| SD-GAP-003 | Busy database | data-modeling | Advanced |
| SD-GAP-004 | Busy frontend | reliability | Intermediate |
| SD-GAP-005 | Choreography | coordination | Expert |
| SD-GAP-006 | Claim check | messaging | Intermediate |
| SD-GAP-007 | Compute resource consolidation | scaling-basics | Intermediate |
| SD-GAP-008 | Federation | data-modeling | Advanced |
| SD-GAP-009 | Gatekeeper | api-design | Advanced |
| SD-GAP-010 | Improper instantiation | scaling-basics | Advanced |
| SD-GAP-011 | Monolithic persistence | data-modeling | Intermediate |
| SD-GAP-012 | No caching | caching | Intermediate |
| SD-GAP-013 | Pipes and filters | messaging | Advanced |
| SD-GAP-014 | Scheduler agent supervisor | coordination | Expert |
| SD-GAP-015 | Security monitoring | reliability | Intermediate |
| SD-GAP-016 | Strangler fig | api-design | Intermediate |
| SD-GAP-017 | Synchronous io | scaling-basics | Expert |
| SD-GAP-018 | Usage monitoring | reliability | Intermediate |
| SD-GAP-019 | Web server caching | caching | Intermediate |
| SD-GAP-020 | Application layer | scaling-basics | Intermediate |
| SD-GAP-021 | Availability monitoring | reliability | Advanced |
| SD-GAP-022 | Back pressure | messaging | Advanced |
| SD-GAP-023 | Cqrs | data-modeling | Advanced |
| SD-GAP-024 | Database caching | caching | Expert |
| SD-GAP-025 | Document store | data-modeling | Intermediate |
| SD-GAP-026 | External config store | reliability | Intermediate |
| SD-GAP-027 | Extraneous fetching | api-design | Advanced |
| SD-GAP-028 | Gateway aggregation | api-design | Advanced |
| SD-GAP-029 | Materialized view | data-modeling | Advanced |
| SD-GAP-030 | Priority queue | messaging | Expert |
| SD-GAP-031 | Pull cdns | caching | Intermediate |
| SD-GAP-032 | Push cdns | caching | Advanced |
| SD-GAP-033 | Sidecar | scaling-basics | Advanced |
| SD-GAP-034 | Sql vs nosql | data-modeling | Intermediate |
| SD-GAP-035 | Udp | scaling-basics | Intermediate |
| SD-GAP-036 | Weak consistency | replication-consistency | Intermediate |
| SD-GAP-037 | Write behind | caching | Expert |
