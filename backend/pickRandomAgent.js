import { getAll } from "./db.js";

export function pickBalancedTeam(agentPool) {
    const rolesNeeded = {
        Duelist: 2,
        Initiator: 1,
        Controller: 1,
        Sentinel: 1
    };

    const picked = new Set();
    let pickedArray = {};
    const usedRoles = {
        Duelist: 0,
        Initiator: 0,
        Controller: 0,
        Sentinel: 0
    };

    const roles = Object.keys(rolesNeeded);
    let tries_x = 0;
    for (const role of roles) {
        const pool = agentPool[role];
        if (!pool || pool.length === 0) continue;

        while (usedRoles[role] < rolesNeeded[role]
            || tries_x < 20
        ) {
            tries_x++;
            const index = Math.floor(Math.random() * pool.length);
            const agentData = pool[index];
            const next = pool[index + 1];

            if (Array.isArray(agentData)) continue;

            const agent = agentData;
            if (picked.has(agent)) continue;

            picked.add(agent);
            pickedArray[agent] = role;
            usedRoles[role]++;

            if (Array.isArray(next)) {
                const complement = next.find(c => !picked.has(c));
                if (complement) {
                    picked.add(complement);
                    pickedArray[complement] = getAgentRole(agentPool, complement);
                    const compRole = pickedArray[complement];
                    if (compRole) usedRoles[compRole]++;
                }
            }

            // Handle case when second Duelist is needed without complement
            if (role === "Duelist" && usedRoles[role] < rolesNeeded[role]) {
                const allDuelists = pool.filter(e => typeof e === 'string' && !picked.has(e));
                if (allDuelists.length > 0) {
                    const duelist = allDuelists[Math.floor(Math.random() * allDuelists.length)];
                    picked.add(duelist);
                    pickedArray[duelist] = "Duelist";
                    usedRoles["Duelist"]++;
                }
            }
        }
    }

    // console.log(JSON.stringify(pickedArray))

    pickedArray = Object.fromEntries(Object.entries(pickedArray).reverse());

    let tries = 0;

    for (const role of roles) {
        while (
            usedRoles[role] > rolesNeeded[role]
            // || 
            // tries < 20
        ) {
            tries++;
            const toRemove = Object.entries(pickedArray).find(([name, r]) => r === role);
            if (!toRemove || toRemove.length < 2) break;
            delete pickedArray[toRemove[0]];
            picked.delete(toRemove[0]);
            usedRoles[role]--;
        }
    }

    pickedArray = Object.fromEntries(Object.entries(pickedArray).reverse());


    console.log(JSON.stringify(Object.keys(pickedArray)))

    return Object.keys(pickedArray);
}


function getAgentRole(pool, agentName) {
    for (const role in pool) {
        const arr = pool[role];
        for (let i = 0; i < arr.length; i++) {
            const entry = arr[i];
            if (typeof entry === 'string' && entry === agentName) return role;
            if (Array.isArray(entry) && entry.includes(agentName)) return role;
        }
    }
    return null;
}
