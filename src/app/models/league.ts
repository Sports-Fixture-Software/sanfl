/**
 * League
 */
import { databaseInjector } from '../bootstrap'
import { DatabaseService } from '../services/database.service'
import { Collection } from '../services/collection'
import { Fixture } from './fixture'
import { Team } from './team'
import * as Promise from 'bluebird'

export class League extends (databaseInjector.get(DatabaseService) as DatabaseService).Model<League> {

    constructor(params?: string | any) {
        if (typeof params === 'string') {
            super()
            this.name = params
        } else {
            super(params)
        }
    }

    get tableName() { return 'league'; }
    get name(): string { return this.get('name') }
    set name(value: string) { this.set('name', value) }

    getTeams(): Promise<Collection<Team>> {
        return this.fetch({ withRelated: ['teams']}).then((res) => {
            return res.related('teams') as Collection<Team>
        })
    }

    /**
     * Needed by bookshelf to setup relationship
     */
    protected fixtures(): Collection<Fixture> {
        return this.hasMany(Fixture)
    }
    /**
     * Needed by bookshelf to setup relationship
     */
   protected teams(): Collection<Team> {
        return this.hasMany(Team)
    }
}
