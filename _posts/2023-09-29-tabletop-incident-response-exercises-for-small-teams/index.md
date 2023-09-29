---
title: 'Tabletop Incident Response Exercises for Small Teams'
date: 2023-09-29
permalink: /posts/tabletop-incident-response-exercises-small-teams
author: Doug Greenbaum
thumbnail: ''
metaDescription: ''
tags: [Engineering, Security]
---
A regular tabletop exercise is part of many organization’s [business continuity planning](https://en.wikipedia.org/wiki/Business_continuity_planning).  I set out to build Close’s Tabletop Exercise with the following goals:

- Measure the effectiveness of our Incident Response Policy.
- Measure the ability of our responders to take action.
- Measure the effectiveness of our responder’s communication.
- Generate an aggregate score that can be tracked over time

There are Tabletop frameworks out there, such as the [CISA Tabletop Exercise Packages](https://www.cisa.gov/resources-tools/services/cisa-tabletop-exercise-packages). I settled on a similar, but abbreviated pattern. The main differences being:

- The scenario is focused exclusively on the responders and their actions.
- The responders are responding to a “live” incident, not answering questions about a past incident. Decisions are made in the moment.
- Some information and results are gated behind a [d20](https://en.wikipedia.org/wiki/D20_Modern) roll.

That’s right. I made this a d20 game.

I picked 2 Engineers from our pool of incident responders. I presented one of them with a fictitious but plausible alert that paged them. This begins the first of 5 phases. Each phase makes life a little worse:

- Notification
    - An alert has fired, what’s wrong?
- Realization
    - Uh oh, this looks like a security incident. Better get some help.
- Remediation
    - A response plan has been hatched, let’s do it!
- Retaliation
    - Ah snap! The attacker is deleting our data! Make it stop!
- Restoration
    - Good thing we have backups. Let’s use them.

In each phase our responders have the following actions available:

- Roll for more information.
- Ask questions of the facilitator (me).
- Escalate to get another Engineer on the call.
    - The new engineer can [assist with die rolls](https://www.dndbeyond.com/sources/basic-rules/using-ability-scores#AdvantageandDisadvantage) and re-roll prior rolls to get more information
- Take an action. This is anything they can think of and explain how to do.

This ended being a rather thorough evaluation of a readiness to respond:

- Several types of incident were explored, including Anomalous Load, a Security Breach, and Data Loss.
- Responders could only do what they knew how to do, illuminating gaps in knowledge.
- Rolling for information helped simulate blind spots and provided a reason to exercise our escalation path.
- Increasing severity over the course of the exercise demonstrated when our responders thought it was appropriate to communicate outside the team.

That’s cool and all, but how did I evaluate it? My grading rubric is as follows with the aggregate score being an average of the 3 sub-scores:

- Policy Awareness. How well did responders know our policy?
    - 1 - The policy played no roll in the response
    - 2 - The policy was considered and disregarded
    - 3 - The policy was consulted as an unfamiliar reference
    - 4 - The policy was consulted as a familiar reference
    - 5 - The policy was followed without needing a reference
- Dynamism. How much time was spent acting vs spinning wheels?
    - 1 - No action was taken within the time frame of the exercise
    - 2 - Action was taken after prompting from those running the exercise
    - 3 - Discordant or incorrect action was taken without prompting
    - 4 - Correct action was taken without prompting
    - 5 - Harmonious and correct action was taken without prompting
- Communication. Were the proper tools used the proper way?
    - 1 - Scenario was disregarded. Most communication occurred outside the rules of the exercise
    - 2 - Scenario partially respected. Minimal communication occurred outside of the rules
    - 3 - Scenario fully respected. No communication occurred outside of the rules
    - 4 - Scenario fully respected. Post mortem is available at the end of the exercise
    - 5 - Scenario fully respected. Post mortem and simulated status page updates generated

The perfect response actively follows published policies, is quick and full of good teamwork, and calls out when post mortems, customer communications, and escalations occur. A poor response does none of those things. Our response team did well, but with room for improvement. This gives us the opportunity to demonstrate that improvement the next time we run this exercise. 

All in all, our d20 inspired tabletop exercise was a success. It exercised our processes, demonstrated some gaps, and generated good evidence for our auditors across a broad range of incident types. We also managed to have a good time doing it. After all, the real treasure is the friends you make along the way. 
