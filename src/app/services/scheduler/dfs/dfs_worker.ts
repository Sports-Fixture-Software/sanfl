/**
 * Copyright (c) 2016 Michael Humphris, Craig Keogh, and Louis Griffith
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to 
 * deal in the Software without restriction, including without limitation the 
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
 * sell copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

import { plotFixtureRotation } from './plot_fixture_rotation'
import { Team as DFSTeam, Match as DFSMatch } from './fixture_constraints'
import { SchedulerParameters } from '../scheduler.service'
import { TeamConstraints } from './team_constraints'
import * as process from 'process'

export function callPlotFixtureRotation(args: SchedulerParameters): DFSMatch[] {
    let teams: DFSTeam[] = []
    let matches: DFSMatch[] = []
    let index = 0
    for (let team of args.teams) {
        teams.push(new TeamConstraints(index,
            {
                maxHome: team.homeGamesMax,
                maxAway: team.awayGamesMax
            },
            {
                consecutiveHomeGamesMax: team.consecutiveHomeGamesMax,
                consecutiveAwayGamesMax: team.consecutiveAwayGamesMax,
            }))
        index++
    }
    for (let match of args.reservedMatches) {
        matches.push(new DFSMatch(match.roundNum, match.homeTeam, match.awayTeam))
    }
    return plotFixtureRotation(teams, matches, args.numRounds, args.verbose)
}

process.on('message', (args: SchedulerParameters) => {
    // can't send functions to processes, so create teams in this process
    try {
        process.send(callPlotFixtureRotation(args))
    } catch (e) {
        process.send({ name: e.name, message: e.message })
    }
})
