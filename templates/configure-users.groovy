#!groovy

import jenkins.install.*
import jenkins.model.*

import hudson.security.*
import hudson.util.*

def instance = Jenkins.getInstance()

def hudsonRealm = new HudsonPrivateSecurityRealm(false)

def users = hudsonRealm.getAllUsers()

users_s = users.collect { it.toString() }

if ("{{ lookup('env', 'JENKINS_USERNAME') }}" in users_s)
{
    def user = hudson.model.User.get("{{ lookup('env', 'JENKINS_USERNAME') }}")

    def password = hudson.security.HudsonPrivateSecurityRealm.Details.fromPlainPassword("{{ lookup('env', 'JENKINS_PASSWORD') }}")

    user.addProperty(password)

    user.save()

    instance.setInstallState(InstallState.INITIAL_SETUP_COMPLETED)

    System.setProperty("hudson.model.DirectoryBrowserSupport.CSP", "")
}
else
{
    hudsonRealm.createAccount("{{ lookup('env', 'JENKINS_USERNAME') }}", "{{ lookup('env', 'JENKINS_PASSWORD') }}")

    instance.setSecurityRealm(hudsonRealm)

    def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
 
    instance.setAuthorizationStrategy(strategy)
 
    instance.save()

    instance.setInstallState(InstallState.INITIAL_SETUP_COMPLETED)

    System.setProperty("hudson.model.DirectoryBrowserSupport.CSP", "")
}