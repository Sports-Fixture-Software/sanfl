import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core'
import { ActivatedRoute, Router, Params } from '@angular/router';
import { REACTIVE_FORM_DIRECTIVES, FormGroup, FormControl, FormBuilder } from '@angular/forms'
import { Validators } from '@angular/common'
import { FixtureService } from '../services/fixture.service'
import { RoundService } from '../services/round.service'
import { MatchConfigService } from '../services/match_config.service'
import { Collection } from '../services/collection'
import { Fixture } from '../models/fixture'
import { League } from '../models/league'
import { Team } from '../models/team'
import { Round } from '../models/round'
import { MatchConfig } from '../models/match_config'
import { RoundForm } from '../models/round.form'
import { DaysOfWeek } from '../util/days_of_week'
import { ButtonPopover } from './button_popover.component'
import { ButtonHidden } from './button_hidden.component'
import { POPOVER_DIRECTIVES, PopoverContent } from 'ng2-popover';
import * as moment from 'moment'

@Component({
    moduleId: module.id.replace(/\\/g, '/'),
    providers: [FixtureService, RoundService, MatchConfigService],
    directives: [ButtonPopover, ButtonHidden, REACTIVE_FORM_DIRECTIVES, POPOVER_DIRECTIVES],
    templateUrl: 'round_list.template.html'
})

export class RoundListComponent implements OnInit {
    constructor(private _changeref: ChangeDetectorRef,
        private _fixtureService: FixtureService,
        private _roundService: RoundService,
        private _matchConfigService: MatchConfigService,
        private _router: Router,
        private _route: ActivatedRoute) {
    }

    @ViewChild('createMatchupButton') createMatchupButton: ButtonPopover
    @ViewChild('createMatchupPopover') createMatchupPopover: PopoverContent
    matchupForm: FormGroup

    ngOnInit() {
        this.matchupForm = new FormGroup({
            round: new FormControl(),
            homeTeam: new FormControl('', [<any>Validators.required]),
            awayTeam: new FormControl('', [<any>Validators.required])
        }, {}, this.differentTeamsSelectedValidator)

        this._router.routerState.parent(this._route)
            .params.forEach(params => {
                let id = +params['id'];
                this._fixtureService.getFixture(id).then((f) => {
                    this.fixture = f
                    return this._fixtureService.getRoundsAndConfig(f)
                }).then((rounds: Collection<Round>) => {
                    this.rounds = rounds.toArray()
                    this.fillInRounds()
                }).then(() => {
                    return this.fixture.getLeague()
                }).then((league: League) => {
                    return league.getTeams()
                }).then((teams: Collection<Team>) => {
                    this.homeTeamsAll = teams.toArray()
                    this.awayTeamsAll = teams.toArray()
                    this.awayTeamsAll.push(new Team('Bye'))
                    this.homeTeams = this.homeTeamsAll.slice(0) //copy
                    this.awayTeams = this.homeTeamsAll.slice(0) //copy
                    this._changeref.detectChanges()
                })
            })
    }

    prepareForm(round: Round) {
        let fc = this.matchupForm.controls['round'] as FormControl
        fc.updateValue(round)
        this.removeTeamsAsAlreadyReserved(round)
    }

    createMatchup(form: RoundForm) {
        this._roundService.addUpdateRound(form.round).then(() => {
            let config = new MatchConfig()
            config.setRound(form.round)
            config.setHomeTeam(form.homeTeam)
            config.setAwayTeam(form.awayTeam)
            let fc = this.matchupForm.controls['homeTeam'] as FormControl
            fc.updateValue(null)
            fc = this.matchupForm.controls['awayTeam'] as FormControl
            fc.updateValue(null)
            return this._matchConfigService.addMatchConfig(config)
        }).then(() => {
            this.createMatchupPopover.hide()
            this._changeref.detectChanges()
        }).catch((err: Error) => {
            this.createMatchupButton.showError('Error creating match-up', err.message)
        })
    }

    /**
     * Fills in the "gaps" in rounds. The database may already have some rounds
     * because of entered constraints. Fill in any gaps with new `Round`.
     */
    private fillInRounds() {
        let runningDate = moment(this.fixture.startDate)
        if (runningDate.day() == DaysOfWeek.Sunday) {
            runningDate.subtract(1, 'day')
        } else if (runningDate.day() < DaysOfWeek.Saturday) {
            runningDate.add(DaysOfWeek.Saturday - runningDate.day(), 'day')
        }
        for (let i = 1; i <= this.getNumberOfRounds(this.fixture.startDate, this.fixture.endDate); i++) {
            let index = this.binarySearch(this.rounds, i, (a: number, b: Round) => {
                return a - b.number
            })
            if (i > 1) {
                runningDate.add(1, 'week')
            }
            if (index < 0) {
                if (i == 1) {
                    this.rounds.splice(~index, 0, new Round({ number: i, startDate: this.fixture.startDate }))
                } else {
                    this.rounds.splice(~index, 0, new Round({ number: i, startDate: moment(runningDate).toDate() }))
                }
            }
        }
    }

    private binarySearch(theArray: any[], element: any, compare: Function): number {
        let m = 0;
        let n = theArray.length - 1;
        while (m <= n) {
            let k = (n + m) >> 1;
            let cmp = compare(element, theArray[k]);
            if (cmp > 0) {
                m = k + 1;
            } else if (cmp < 0) {
                n = k - 1;
            } else {
                return k;
            }
        }
        return ~m
    }

    private removeTeamsAsAlreadyReserved(round: Round) {
        round.getMatchConfigs().then((configs) => {
            this.homeTeams = this.homeTeamsAll.slice(0) //copy
            this.awayTeams = this.awayTeamsAll.slice(0) //copy
            if (configs) {
                configs.each((config) => {
                    let count = 0
                    for (let i = this.homeTeams.length - 1; i >= 0; i--) {
                        if (this.homeTeams[i].id == config.homeTeam_id ||
                            this.homeTeams[i].id == config.awayTeam_id) {
                            this.homeTeams.splice(i, 1)
                            count++
                            if (count >= 2) {
                                break
                            }
                        }
                    }
                    count = 0
                    for (let i = this.awayTeams.length - 1; i >= 0; i--) {
                        if (config.awayTeam_id) { // not the bye
                            if (this.awayTeams[i].id == config.awayTeam_id ||
                                this.awayTeams[i].id == config.homeTeam_id) {
                                this.awayTeams.splice(i, 1)
                                count++
                                if (count >= 2) {
                                    break
                                }
                            }
                        }
                    }
                })
            }
            this._changeref.detectChanges()
            let fc = this.matchupForm.controls['homeTeam'] as FormControl
            fc.updateValue(null)
            fc = this.matchupForm.controls['awayTeam'] as FormControl
            fc.updateValue(null)
        })
    }

    /**
     * Return the number of rounds between two dates.
     * 
     * The `startDate` can be any day of the week. If `startDate` is a weekend,
     * the round count will include that weekend, otherwise count starts at
     * next weekend. 
     * 
     * The `endDate` can be any day of the week. If `endDate` is a weekend, the
     * round count will include that weekend, otherwise count ends at the
     * previous weekend.
     * 
     * If both `startDate` and `endDate` are mid-week in the same week, the
     * returned round count will be 0.
     * 
     * If both `startDate` and `endDate` are on the weeked in the same week, the
     * returned round count will be 1.
     * 
     * If `startDate` is later than `endDate`, returned round count will be 0.
     */
    private getNumberOfRounds(startDate: Date, endDate: Date): number {
        let start = moment(startDate)
        let end = moment(endDate)
        if (start.day() == DaysOfWeek.Sunday) {
            start.subtract(1, 'day')
        } else if (start.day() < DaysOfWeek.Saturday) {
            start.add(DaysOfWeek.Saturday - start.day(), 'day')
        }
        if (end.day() < DaysOfWeek.Saturday) {
            end.subtract(end.day() + 1, 'day')
        }
        let daysdiff = end.diff(start, 'days')
        if (daysdiff < 0) {
            return 0
        } else if (daysdiff == 0) {
            return 1
        } else {
            return Math.round(daysdiff / 7) + 1
        }
    }

    /**
     * Validator to ensure different teams are selected. Can't reserve a
     * match-up of teamX vs teamX
     */
    private differentTeamsSelectedValidator = ({value}: FormGroup): { [key: string]: any } => {
        return value.homeTeam == value.awayTeam ? { equal: true } : null
    }

    private initComplete: boolean = false
    private rounds: Round[] = []
    private homeTeams: Team[]
    private homeTeamsAll: Team[]
    private awayTeams: Team[]
    private awayTeamsAll: Team[]
    private fixture: Fixture
}
