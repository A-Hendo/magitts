import * as vscode from 'vscode';
import { ForgeState } from './model/forgeState';
import { Issue } from './model/issue';
import { PullRequest } from './model/pullRequest';
import request from './request';

const GITHUB_AUTH_PROVIDER_ID = 'github';
const SCOPES = ['repo'];

export async function getGithubForgeState(remoteUrl: string): Promise<ForgeState> {

	let cleaned = remoteUrl
		.replace(/.*github.com(\/|:)/, '')
		.replace('.git', '')
		.split('/').filter(Boolean);

	const owner = cleaned[0];
	const repo = cleaned[1];

	let accessToken = await authenticate();

	let [pullRequests, issues] = await getPullRequestsAndIssues(accessToken, owner, repo);

	return {
		forgeRemote: remoteUrl.toString(),
		pullRequests,
		issues
	};
}

async function authenticate(): Promise<string> {

	const session = await vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, SCOPES, { createIfNone: true });
	return session.accessToken;
}

async function getPullRequestsAndIssues(accessToken: string, owner: string, repo: string): Promise<[PullRequest[], Issue[]]> {

	let res = await queryGithub(accessToken,
		{
			query:
				`query GetOpenPullRequests($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
              pullRequests(last:20, states: OPEN) {
                edges { node {
                  number
                  title
                  author {
                    login
                  }
                  createdAt
                  bodyText
                  comments(first: 50) {
                    edges { node {
                      author { login }
                      createdAt
                      bodyText
                    }}
                  }
                  labels(last: 10) {
                    edges { node {
                      name
                      color
                    }}
                  }
                  commits(last: 100) {
                    edges { node {
                      commit {
                        oid
                        message
                        author { name email }
                        authoredDate
                        committedDate
                        parents(last: 5) {
                          edges { node {
                            oid
                          }}
                        }
                      }
                    }}
                  }
              }}}
              issues(last:50, states: OPEN) {
                edges { node {
                  number
                  title
                  author {
                    login
                  }
                  createdAt
                  bodyText
                  comments(first: 50) {
                    edges { node {
                      author { login }
                      createdAt
                      bodyText
                    }}
                  }
                  labels(last: 10) {
                    edges { node {
                      name
                      color
                    }}
                  }
              }}}
          }}`,
			variables: {
				owner,
				repo
			}
		}
	);

	if (res.errors) {
		throw new Error(res.errors);
	}

	// assignees(last: 10) {
	//   edges { node {
	//     name
	//     login
	//     email
	//   }}
	// }

	return [

		res.data.repository.pullRequests.edges.map(({ node }: any) => ({
			number: node.number,
			title: node.title,
			remoteRef: `pull/${node.number}/head`,
			author: node.author.login,
			createdAt: node.createdAt,
			bodyText: node.bodyText,
			comments: node.comments.edges.map(mapComment),
			assignees: [],
			// assignees: node.assignees.edges.map(mapUser),
			labels: node.labels.edges.map(mapLabel),
			commits: node.commits.edges.map(mapCommit)
		})).reverse(),

		res.data.repository.issues.edges.map(({ node }: any) => ({
			number: node.number,
			title: node.title,
			author: node.author.login,
			createdAt: node.createdAt,
			bodyText: node.bodyText,
			comments: node.comments.edges.map(mapComment),
			assignees: [],
			// assignees: node.assignees.edges.map(mapUser),
			labels: node.labels.edges.map(mapLabel)
		})).reverse()
	];
}

const mapComment = ({ node }: any) => ({
	author: node.author.login,
	createdAt: node.createdAt,
	bodyText: node.bodyText
});

const mapUser = ({ node }: any) => ({
	displayName: node.name,
	username: node.login,
	email: node.email
});

const mapLabel = ({ node }: any) => ({
	name: node.name,
	color: node.color
});

const mapCommit = ({ node: { commit } }: any) => ({
	hash: commit.oid,
	message: commit.message,
	parents: commit.parents.edges.map((node: any) => node.oid),
	authorDate: commit.authoredDate,
	authorName: commit.author.name,
	authorEmail: commit.author.email,
	commitDate: commit.committedDate
});

async function queryGithub(accessToken: string, ql: object) {
	let res = await request
		.post('https://api.github.com/graphql')
		.set('Authorization', `Bearer ${accessToken}`)
		.set('User-Agent', 'magitts')
		.send(JSON.stringify(ql));

	return JSON.parse(res.data);
}