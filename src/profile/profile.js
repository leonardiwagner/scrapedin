const openPage = require('../openPage')
const scrapSection = require('../scrapSection')
const scrapAccomplishmentPanel = require('./scrapAccomplishmentPanel')
const scrapConnections = require('./scrapConnections')
const scrollToPageBottom = require('./scrollToPageBottom')
const seeMoreButtons = require('./seeMoreButtons')
const contactInfo = require('./contactInfo')
const template = require('./profileScraperTemplate')
const cleanProfileData = require('./cleanProfileData')

const logger = require('../logger')(__filename)

module.exports = async (browser, cookies, url, waitTimeToScrapMs = 500, hasToGetContactInfo = false, puppeteerAuthenticate = undefined) => {
  logger.info(`starting scraping url: ${url}`)

  const page = await openPage({ browser, cookies, url, puppeteerAuthenticate })
  const profilePageIndicatorSelector = '.pv-profile-section'
  await page.waitFor(profilePageIndicatorSelector, { timeout: 5000 })
    .catch(() => {
      //why doesn't throw error instead of continuing scraping?
      //because it can be just a false negative meaning LinkedIn only changed that selector but everything else is fine :)
      logger.warn('profile selector was not found')
    })

  logger.info('scrolling page to the bottom')
  await scrollToPageBottom(page)
  
  if(waitTimeToScrapMs) {
    logger.info(`applying 1st delay`)
    await new Promise((resolve) => { setTimeout(() => { resolve() }, waitTimeToScrapMs / 2)})
  }

  await seeMoreButtons.clickAll(page)

  if(waitTimeToScrapMs) {
    logger.info(`applying 2nd (and last) delay`)
    await new Promise((resolve) => { setTimeout(() => { resolve() }, waitTimeToScrapMs / 2)})
  }


  const [profile] = await scrapSection(page, template.profile)
  const [about] = await scrapSection(page, template.about)
  const positions = await scrapSection(page, template.positions)
  const educations = await scrapSection(page, template.educations)
  const [recommendationsCount] = await scrapSection(page, template.recommendationsCount)
  const recommendationsReceived = await scrapSection(page, template.recommendationsReceived)
  const recommendationsGiven = await scrapSection(page, template.recommendationsGiven)
  const skills = await scrapSection(page, template.skills)
  const accomplishments = await scrapSection(page, template.accomplishments)
  const courses = await scrapAccomplishmentPanel(page, 'courses')
  const honors = await scrapAccomplishmentPanel(page, 'honors')
  const languages = await scrapAccomplishmentPanel(page, 'languages')
  const organizations = await scrapAccomplishmentPanel(page, 'organizations')
  const patents = await scrapAccomplishmentPanel(page, 'patents')
  const projects = await scrapAccomplishmentPanel(page, 'projects')
  const publications = await scrapAccomplishmentPanel(page, 'publications')
  const testScores = await scrapAccomplishmentPanel(page, 'test-scores');
  const volunteerExperience = await scrapSection(page, template.volunteerExperience)
  const peopleAlsoViewed = await scrapSection(page, template.peopleAlsoViewed)
  const contact = hasToGetContactInfo ? await contactInfo(page) : []
  const connections = await scrapConnections(page);

  await page.close()
  logger.info(`finished scraping url: ${url}`)

  const rawProfile = {
    profile,
    about,
    positions,
    educations,
    skills,
    recommendations: {
      givenCount: recommendationsCount ? recommendationsCount.given : "0",
      receivedCount: recommendationsCount ? recommendationsCount.received : "0",
      given: recommendationsReceived,
      received: recommendationsGiven
    },
    accomplishments,
    courses,
    honors,
    languages,
    organizations,
    patents,
    projects,
    publications,
    testScores,
    peopleAlsoViewed,
    volunteerExperience,
    contact,
    connections
  }

  const cleanedProfile = cleanProfileData(rawProfile)
  return cleanedProfile
}
