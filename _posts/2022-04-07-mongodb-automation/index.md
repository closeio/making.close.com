---
layout: post
title: 'Automating MongoDB with Ansible'
date: 2022-04-07
permalink: /posts/mongodb-automation/
author: Doug Greenbaum
thumbnail: ''
metaDescription: ''
tags: [Engineering, MongoDB]
---

Close is powered by MongoDB. It’s our source of truth for the state of most objects in the ecosystem. Though our largest deployment may not be quite web-scale, we do have a considerable footprint for our primary sharded cluster. Spanning 18 shards, 19 replica sets, and 69 total hosts upgrades and maintenance must be heavily automated to be feasible let alone smooth. We use [Ansible](https://www.ansible.com/) to automate our MongoDB workflows. Since we’ve implemented this automation stack our MongoDB upgrades have gone from taking weeks, requiring outages and after hours work, to taking hours with no outages and no after hours work. 

We need to be able to upgrade MongoDB without taking the database down or degrading its performance. At Close we follow the standard recommendations of MongoDB when it comes to our [Sharded Cluster Architecture](https://docs.mongodb.com/manual/core/sharded-cluster-components/) and [Replica Set Architecture](https://docs.mongodb.com/manual/replication/).  Our replica sets consist of 3 members of identical configuration in different availability zones in AWS. The [official MongoDB documentation](https://docs.mongodb.com/manual/tutorial/upgrade-revision/) is excellent and provides the high level steps needed to accomplish the task on a sharded cluster. 

The documentation is excellent, though there are some practical considerations that aren’t covered. For example, we don’t do in place upgrades. We provision an entire new generation of instances and replace the existing generation. This gives us an opportunity to upgrade the underlying operating system and monitoring components. It also gives us a clear rollback path if `Something Bad ™` happens.

So how does this change our requirements? Now instead of needing to ssh into 69 nodes we have 69 * 2 = 138 nodes to wrangle.

When it comes to sshing into lots of things at the same time there should be one tool that comes to mind: No, not [pssh](https://linux.die.net/man/1/pssh); [Ansible](https://www.ansible.com/). 

The tasks Ansible is responsible for in our automation are as follows:


- Installing MongoDB on a new node
- Identifying the primary of each replica set
- Joining new nodes to each replica set
- Orchestrating elections across all replica sets
- Removing old nodes from all replica sets

I’m not going to cover installing MongoDB. The [official documentation](https://docs.mongodb.com/manual/installation/) covers that topic well.

The veteran Ansible v2.9 using MongoDB DBAs among my readers are surely asking, “How do you do all that cool stuff with Ansible? [The existing MongoDB modules](https://docs.ansible.com/ansible/2.9/modules/list_of_database_modules.html#mongodb) don’t do a whole lot.” The short answer is: in the `mongo` shell, via Ansible, on the primary of each replica set.

(NOTE: Ansible v5 has a lot more [MongoDB modules](https://docs.ansible.com/ansible/5/collections/community/mongodb/index.html) to play with but we didn’t have that at the time.)

Let’s take a look at our Playbook that adds a new node to a replica set:

    ---
    - hosts: "{{ target }}"
      tasks:
        - name: Identify primaries
          shell: "{{ mongodb_cmd }} --eval 'db.isMaster().ismaster'"
          register: is_primary
          changed_when: false
          check_mode: no
          when: replica_set is defined
    
        - name: Detect member nodes
          shell: "{{ mongodb_cmd }} --eval 'load(\"{{ mongodb_scriptsdir[role] }}/joinNodesHelper.js\");listNodes();'"
          when: (replica_set is defined) and (is_primary is defined) and (is_primary.stdout_lines[0] == "true")
          register: cluster_nodes
          changed_when: false
          check_mode: no
    
        - name: Add nodes to rs
          shell: "{{ mongodb_cmd }} --eval 'rs.add({host:\"{{ item  }}.{{ dns_zone }}:{{ mongodb_ports[role] }}\", hidden:true, priority:0, votes:0})'"
          loop: ["{{ groups[replica_set] | difference(cluster_nodes.stdout | from_json) | first }}"]
          when: (replica_set is defined) and (is_primary is defined) and (is_primary.stdout_lines[0] == "true") and not (ansible_check_mode)

There’s a lot to unpack here. Firstly, what is this running against? The `hosts` parameter is set by the `target` variable. The `target` for this playbook is an Ansible inventory group or list of hostnames. Ansible will ssh into each identified instance.

We can operate across multiple replica sets simultaneously because the `replica_set` variable is determined by the `replica_set` tag on our EC2 instances. The play uses this to ensure that we always add the right node to the right replica set even when operating on the members of many replica sets.

The real work is done in the `mongo` shell. The `mongodb_cmd` variable represents the invocation of the `mongo` shell on each machine.

A good question to ask at this point is, “Why are you running the mongo shell on the remote machines instead of running it on the Ansible machine?” The reason we do it this way is because this play is likely being used in the context of a version upgrade. For example, adding a v4.2 node to a v4.0 replica set. In this situation it behooves us to use the shell version present on the primary so we always use the correct version for the replica set.

The first task this play has is to identify the primaries it’s working with. This is easy. It just invokes the mongo shell and runs `db.isMaster()` storing the result in an Ansible variable scoped to the machine. Future tasks are run only on primaries and are skipped when `is_primary` isn’t true.

The next task gathers the replica set’s opinion on which nodes are part of it. To get a list of hostnames we can use for future steps we need to massage the output of `rs.status()` a bit. Thankfully the mongo shell is a fully functional JavaScript runtime! So we load in a helper script and invoke a function. Funky.


    function listNodes() {
        var status = rs.status();
        var nodes = [];
        var nameRegex = /your-regex-here/g;
        status.members.forEach(function(member){
            nodes.push(member.name.match(nameRegex)[0])
        });
        return nodes;
    }

In short, `rs.status()` wants to give a name like `mongo.node:27017`. Ansible just wants the name without the domain or port (`mongo`). The `listNodes()` function accomplishes this, returning a list of host names appropriate for the `cluster_nodes` variable.

The final task of this playbook adds any nodes that are included in the run that are tagged as part of a replica set but do not show up in `rs.status()` to the appropriate replica set. Wow.

This is where Ansible really shines. Let’s take a look at that `loop:` definition:


    loop: ["{{ groups[replica_set] | difference(cluster_nodes.stdout | from_json) | first }}"]

So first we get all the nodes that should be in the replica set because they’re tagged in AWS as part of the replica set. Then we ask Ansible via the [difference filter](https://docs.ansible.com/ansible/latest/user_guide/playbooks_filters.html#selecting-from-sets-or-lists-set-theory) to limit that set to nodes that are not currently part of the replica set. We then operate only on the first of these nodes if there’s many of them. This is a safety feature so we don’t end up doing multiple initial syncs on the same replica set at once.

This loop statement is my favorite part of the entire playbook. You can just keep running the task over and over and the system will eventually converge on a state where all existing tagged nodes are part of the correct replica set. And most importantly it’s idempotent once all nodes are joined. Because idempotence matters.

We follow a similar pattern for our other playbooks. We load JavaScript functions into the mongo shell and execute those functions via Ansible. It works well, and it’s a lot less work than doing it by hand.

