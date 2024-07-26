import { QuickChallenge } from "../Model/QuickChallenge.js";
import { Team } from "../Model/Team.js";
import { TeamUser } from "../Model/TeamUser.js";
import { QuickChallengeRepository } from "../Repository/QuickChallengeRepository.js";
import { UserRepository } from "../Repository/UserRepository.js";
import uuidV4 from "../utils/uuidv4Generator.js";
import randomStringGenerator from "../utils/randomStringGenerator.js";
import { User } from "../Model/User.js";

const quickChallengeRepository = new QuickChallengeRepository();
const userRepository = new UserRepository();

const possibleBotPictures = ["player2", "player3", "player4"];

export class QuickChallengeService {
  async createQuickChallenge(
    quickChallenge: QuickChallenge,
    numberOfTeams: number
  ) {
    console.log("quick challenge is online: ", quickChallenge.online)
    if (quickChallenge.online) {
      const owner = await userRepository.getUserById(quickChallenge.ownerId);
      const team = new Team(uuidV4(), owner.name, quickChallenge.id, owner);
      const teamUser = new TeamUser(uuidV4(), team, 0, owner);

      return await quickChallengeRepository.insert(
        quickChallenge,
        [team],
        [teamUser]
      );
    } else {
      console.log("caiu")
      const owner = await userRepository.getUserById(quickChallenge.ownerId);
      const team = new Team(uuidV4(), owner.name, quickChallenge.id, owner);
      const teamUser = new TeamUser(uuidV4(), team, 0, owner);
      let teams: Team[] = [team];
      let teamsUsers: TeamUser[] = [teamUser];
      for (let i = 0; i < numberOfTeams - 1; i++) {
        const teamBot = new Team(
          uuidV4(),
          possibleBotPictures[i],
          quickChallenge.id
        );
        const teamUserBot = new TeamUser(
          uuidV4(),
          teamBot,
          0,
          undefined,
          undefined,
          undefined,
          undefined,
          possibleBotPictures[i]
        );
        teams.push(teamBot);
        teamsUsers.push(teamUserBot);
      }
      return await quickChallengeRepository.insert(
        quickChallenge,
        teams,
        teamsUsers
      );
    }
  }

  async getUserQuickChallengesById(userId: string) {
    return await quickChallengeRepository.getUserQuickChallengesById(userId);
  }

  async getUserPlayingQuickChallengesById(userId: string) {
    return await quickChallengeRepository.getUserPlayingQuickChallengesById(userId);
  }

  async deleteUserQuickChallengesById(userId: string) {
    return await quickChallengeRepository.deleteUserQuickChallengesById(userId);
  }

  async getQuickChallengeById(id: string) {
    return await quickChallengeRepository.getQuickChallengeById(id);
  }

  async deleteQuickChallenge(quickChallengeToDelete: QuickChallenge) {
    return await quickChallengeRepository.deleteQuickChallenge(
      quickChallengeToDelete
    );
  }

  async patchScore(score: number, teamUser: TeamUser) {
    teamUser.score = score;
    return await quickChallengeRepository.updateTeamUser(teamUser);
  }

  async patchAlreadyBegin(alreadyBegin: boolean, challenge: QuickChallenge) {
    challenge.alreadyBegin = alreadyBegin;
    return await quickChallengeRepository.updateAlreadyBeginQuickChallenge(
      challenge
    );
  }

  async getValidInvitationCode() {
    const INVITATION_CODE_LENGTH = 5
    var randomInvitationCode = randomStringGenerator(INVITATION_CODE_LENGTH)
    var quickChallengesWithThisInvitationCode = await quickChallengeRepository.getQuickChallengeByInvitationCode(randomInvitationCode)
    
    while(quickChallengesWithThisInvitationCode.length > 0) {
      randomInvitationCode = randomStringGenerator(INVITATION_CODE_LENGTH)
      quickChallengesWithThisInvitationCode = await quickChallengeRepository.getQuickChallengeByInvitationCode(randomInvitationCode)
    }
    
    return randomInvitationCode
  }

  async patchFinished(finished: boolean, challenge: QuickChallenge) {
    challenge.finished = finished;
    return await quickChallengeRepository.updateFinishedQuickChallenge(
      challenge
    );
  }

  async insertTeam(quickChallenge: QuickChallenge, userId: string) {
    const member = await userRepository.getUserById(userId);
    const team = new Team(uuidV4(), member.name, quickChallenge.id, member);
    const teamUser = new TeamUser(uuidV4(), team, 0, member);
    await quickChallengeRepository.insertTeam(team, teamUser)
    const quickChallengeWithNewTeam = await quickChallengeRepository.getQuickChallengeById(quickChallenge.id)

    return quickChallengeWithNewTeam
  }

  async exitChallenge(quickChallenge: QuickChallenge, usersTeam: Team, user: User) {
    //only one team at the challenge
    if(quickChallenge.teams.length <= 1) {
      //only the owner at the challenge
      if(usersTeam.members.length <= 1) {
        await quickChallengeRepository.deleteQuickChallenge(quickChallenge)
        return
      }
      else {
        //there is only one team at this challenge and the team has more than one member
        if(quickChallenge.ownerId === usersTeam.ownerId) {
          //needs new owner for the team and for the challenge
          var newOwner
          usersTeam.members.forEach(function(member) {
            if(member.userId != user.id) {
              newOwner = member
              return
            }
          })
          if(newOwner) {
            await quickChallengeRepository.updateChallengeAndTeamOwner(quickChallenge, usersTeam, newOwner)
            return
          }
        }
      }
    }
    else {
      //there is more than one team at this challenge

      //the user is not the owner of this challenge
      if(quickChallenge.ownerId != user.id) {
        if(usersTeam.members.length <= 1) {
          //delete the team because it has only the one member who is exiting
          await quickChallengeRepository.deleteTeamById(usersTeam.id)
          return
        }
        else {
          //the team needs a new owner and the user needs to get out of it
          var newOwner
            usersTeam.members.forEach(function(member) {
              if(member.userId != user.id) {
                newOwner = member
                return
              }
            })
            if(newOwner) {
              await quickChallengeRepository.removeMemberAndSetNewTeamOwner(usersTeam, newOwner, user)
              return
            }
        }
      }
      else {
        //the user is the owner of the challenge
        if(usersTeam.members.length <= 1) {
          //get new owner for the challenge and delete the old owner's team
          var newChallengeOwnerId: string = ''

          quickChallenge.teams.forEach(function(team) {
            if(team.ownerId != quickChallenge.ownerId) {
              newChallengeOwnerId = (team.ownerId as string)
              return
            }
          })

          await quickChallengeRepository.deleteTeamAndSetNewChallengeOwner(quickChallenge, usersTeam, newChallengeOwnerId)
          return
        }
        else {
          //get new owner for the challenge and for the team
          var newTeamAndChallengeOwnerId: string = ''

          usersTeam.members.forEach(function(member) {
            if(member.id != user.id) {
              newTeamAndChallengeOwnerId = member.id
              return
            }
          })

          await quickChallengeRepository.setNewTeamAndChallengeOwner(quickChallenge, usersTeam, newTeamAndChallengeOwnerId)
          return
        }
      }
    }
  }

  async removeParticipant(quickChallenge: QuickChallenge, userToBeRemoved: User) {
    var usersTeam: Team | undefined = undefined
    quickChallenge.teams.forEach(function(team) {
      team.members.forEach(function(member) {
        if(member.userId === userToBeRemoved.id) {
          usersTeam = team
          return
        }
      })
      if(usersTeam) {
        return
      }
    })
    if(typeof usersTeam != 'undefined') {
      const team = usersTeam as Team
      if(team.ownerId === userToBeRemoved.id && team.members.length > 1) {
        var newOwner = team.members[0]
        team.members.forEach(function(member) {
          if(member.userId != team.ownerId) {
            newOwner = member
            return
          }
        })
        return await quickChallengeRepository.removeMemberAndSetNewTeamOwner(team, newOwner, userToBeRemoved)
      }
      else {
        return await quickChallengeRepository.deleteTeamById(team.id)
      }
    }
  }
}
