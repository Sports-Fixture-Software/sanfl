import { Match, Team, MatchState, ConTable } from './FixtureConstraints';

/**
 * plotFixture
 * 
 * Plots a fixture with enough rounds for each team to play every other at most
 * once. Uses DFS through the solution space, pruning branches that break 
 * simple constraints.
 * 
 * Params:
 * teams: Team[] The teams playing in the season fixture. These must implement
 *               the Team interface. Does NOT include team of index -1. Must 
 *               have an even number of elements (even teams or odd teams + bye)
 * resvdMatches: Match[] The matches that are already locked in before 
 *                       generation begins. Order not needed.
 * globalCon: Team[] The constraints that apply to EVERY team if their Team
 *                   interface members are not specified.
 * 
 * Returns:
 * Match[] A complete and legal fixture. Ordering is not guaranteed. Sort by 
 *         round number for ease of plotting.
 * 
 * Throws Errors:
 * 'Odd number of teams...' if there is an odd number of teams.
 * 'Reserved Matches clash with basic constraints...' One or more of the 
 *   reserved matches breaks rotation, or tries to play one team twice in one 
 *   round, or tries to play a team against itself.
 * 'Solution could not be found...' The function ran through the entire 
 *   solution space and could not find a solution. This is most likely because 
 *   constraints made a solution impossible without this function picking up on
 *   it. 
 */
function plotFixtureRotation( teams: Team[], resvdMatches: Match[], globalCon: Team ): Match[] {
    
    /**
     * fillFrom
     * Fills out the given ConTable by DFS and backtracking. Finds a match and
     * recurses until the entire rotation is filled. Obeys the constraints of 
     * the teams supplied in the Team array. This _might_ take a while to run.
     * 
     * The crntMatchCount is to help the function keep track of the number of 
     * games set so far. If there have been manual matchups before calling 
     * fillFrom, the number of them MUST be supplied in crntMatchCount.
     * 
     * MUTATES THE CONTABLE. SAVE IT BEFORE CALLING IF YOU WANT TO TRY ANOTHER 
     * WAY.
     * 
     * Returns:
     * True if the ConTable was successfully filled.
     * False if the Contable could not be successfully filled with any solution.
     * 
     * Throws:
     * "Starting round is out of bounds..." startingRnd must be between 0 and 
     *    the number of teams -1.
     */
    function fillFrom( startingRnd: number, table: ConTable, teams: Team[], crntMatchCount: number ): boolean {
        // Sanity checking starting round.
        var teamsCount: number = teams.length;
        var roundCount: number = teamsCount - 1;
        if( startingRnd > roundCount || startingRnd < 0 ){
            throw new Error("Starting round is out of bounds for this rotation.");
        }

        var currentMatch: Match;
        currentMatch.roundNum = startingRnd;
        currentMatch.homeTeam = Math.floor(Math.random() * (teamsCount));
        currentMatch.awayTeam = Math.floor(Math.random() * (teamsCount));
        var mask: number;
        var matchFound: boolean = false;
        
        // Iterating over rounds while failing, recursing where succeeding.
        for( var i: number = 0; i < roundCount; i++ ){

            // Home teams, iterating until we can recurse.
            for( var j: number = 0; j < teamsCount; j++ ){
                mask = table.getMask(currentMatch);

                // Checking if home team is available.
                if( (mask & MatchState.HOME_PLAYING_AWAY) === 0 &&
                    (mask & MatchState.HOME_PLAYING_HOME) === 0 ){
                    
                    // Away teams, iterating until we can recurse.
                    for( var k: number = 0; k < teamsCount; k++ ){
                        mask = table.getMask(currentMatch);

                        // Checking if away team is available.
                        if( (mask & MatchState.ILLEGAL)           === 0 &&
                            (mask & MatchState.RESERVED)          === 0 &&
                            (mask & MatchState.MATCH_SET)         === 0 &&
                            (mask & MatchState.AWAY_PLAYING_AWAY) === 0 &&
                            (mask & MatchState.AWAY_PLAYING_HOME) === 0 ){
                        
                            // Away team and home team available: Match found
                            // Checking constraints

                            // Committing and/or backtracking the match 
                            // RECURSE HERE, matchcount + 1
                            matchFound = fillFrom( currentMatch.roundNum, table, teams, crntMatchCount+1 );

                        }

                        if( matchFound ){
                            break;
                        }

                        // Go to next away team
                        currentMatch.awayTeam++;
                        if( currentMatch.awayTeam >= teamsCount ){
                            currentMatch.awayTeam = 0;
                        }
                    }
                }

                if( matchFound ){
                    break;
                }

                // Go to the next home team
                currentMatch.homeTeam++;
                if( currentMatch.homeTeam >= teamsCount ){
                    currentMatch.homeTeam = 0;
                }
                
            }

            if( matchFound ){
                break;
            }

            // Go to the next round
            currentMatch.homeTeam++;
            if( currentMatch.roundNum >= roundCount ){
                currentMatch.roundNum = 0;
            }

        }

        // Checking if the conTable is fully set.
        if( crntMatchCount === (roundCount*(teamsCount/2))) ){
            // If so, we can go up the recursion stack with success 
            matchFound = true;
        }

        return matchFound;
    }
    
    // Checking for odd number of teams
    if( teams.length % 2 != 1 ){
        throw new Error('Odd number of teams in the teams parameter. Add a bye to make it even.');
    }

    // Creating and populating matrix that stores the matchup states.
    var matchupState: ConTable = new ConTable( teams.length );
    var successFlag: boolean = true;

    for( let match of resvdMatches ){
        successFlag = matchupState.setMatch(match, (MatchState.MATCH_SET & MatchState.RESERVED));
        if( !successFlag ){
            throw new Error('Reserved Matches clash with basic constraints in this rotation.');
        }
    }

    // Populate the rest of the ConTable, starting from a random round
    var startRound: number = Math.floor(Math.random() * (teams.length));
    var finalMatches: Match[] = resvdMatches.slice();
    if( this.fillFrom(startRound, matchupState, teams, finalMatches) ){
        
        // SEARCH finalMatches BY ROUND ORDER
        
        return finalMatches;
    }

    throw new Error("Solution could not be found in the search space.");
}
