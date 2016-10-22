import { TestApp, computerSpeed } from '../init'
import * as webdriverio from 'webdriverio'
import * as Promise from 'bluebird'

/**
 * end-to-end test suite for application initialisation
 */
describe('application initialise', function () {
    let app: any
    
    beforeEach((done) => {
        app = TestApp.startApp(done)
    }, 7000 * computerSpeed)

    afterEach((done) => {
        TestApp.stopApp(app, done)
    }, 7000 * computerSpeed)

    /**
     * Test a browser window is displayed and angular loads.
     */
    it('browser window displayed with angular loaded', (done) => {
        let client = app.client as webdriverio.Client<void>
        client.waitForExist('router-outlet').then((found) => {
            expect(found).toBe(true)
            return app.browserWindow.isVisible()
        }).then((visible) => {
            expect(visible).toBe(true)
            done()
        })
    }, 6000 * computerSpeed)
})