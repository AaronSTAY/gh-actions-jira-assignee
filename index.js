const core = require('@actions/core');
const JiraApi = require("jira-client")

let jira, domain, username, password, jql, fieldName, fieldValue;
(async () => {
    try {
        domain = core.getInput("domain");
        username = core.getInput("username");
        password = core.getInput("password");
        jql = core.getInput("jql");
        fieldValue = core.getInput("fieldValue");
        fieldName = core.getInput("fieldName");

        if (!jql || !fieldName || !fieldValue) {
            core.setFailed(`Please provide jql, fieldName and fieldValue`);
            return;
        }

        // Initialize
        jira = new JiraApi({
            protocol: "https",
            host: domain,
            username: username,
            password: password,
        });
        searchAndUpdate(jql, fieldName, fieldValue)
    } catch (error) {
        core.setFailed(error.message);
    }
})();

async function searchAndUpdate(jql, fieldName, fieldValue) {
    const issues = await searchIssues(jql);
    for (let i = 0; i < issues.issues.length; i++) {
        const issue = issues.issues[i];
        updateIssue(issue, fieldName, fieldValue);
    }
}

async function searchIssues(jql) {
    return await jira.searchJira(jql);
}

async function updateIssue(issue, fieldName, fieldValue) {
    // FixVersion is an Object, not a simple string
    if (fieldName === "fixVersions") {
        // from e.g. TEST-1 get the project key --> TEST
        const projectKey = getProjectKey(issue.key);
        const projectId = await getProjectId(projectKey);
        const version = await getVersion(projectId, fieldValue);
        return await addVersion(issue, version.id);
    } else if(fieldName === "assigneeName"){
        return await jira.updateAssignee(issue.id, fieldValue);

    
    } else {
        return await jira.updateIssue(issue.id, {
            fields: {
                [fieldName]: fieldValue
            }
        });
    }
}

async function getVersion(projectId, versionName) {
    const versions = await jira.getVersions(projectId);
    for (let i = 0; i < versions.length; i++) {
        const version = versions[i];
        if (version.name === versionName) {
            return version;
        }
    }
    return undefined;
}

async function addVersion(issue, versionId) {
    await jira.updateIssue(issue.id, {
        update: {
            fixVersions: [{"add": {id: versionId}}]
        }
    });
}

async function getProjectId(projectKey) {
    const project = await jira.getProject(projectKey);
    return project.id
}

function getProjectKey(issueKey) {
    return issueKey.substring(0, issueKey.indexOf("-"));
}
