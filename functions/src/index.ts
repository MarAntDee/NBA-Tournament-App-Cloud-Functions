import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const onRoundBegan = functions.https.onRequest(async (request, response) => {

    try {

        const roundDoc = await admin.firestore().doc('drafting/roundStats');
        const teamDoc = await admin.firestore().collection('drafting/roundStats/teams')
            .orderBy('order', 'asc');
        const roundSnap = await roundDoc.get();
        const teamSnap = await teamDoc.get();
        let currentRound: number = roundSnap.data()!.round + 1;
        let participatingTeams: string[] = [];
        let participatingIds: string[] = [];

        const timeBegan: FirebaseFirestore.Timestamp = roundSnap.data()!.timeBegan;
        const timeBeganEpoch = timeBegan.seconds;

        if (admin.firestore.Timestamp.now().seconds - timeBeganEpoch < 30) {
            return response.send({
                'message' : 'You pressed the start round button twice'
            });
        }

        else {
            await roundDoc.set({
                'roundOrder' : [],
                'idOrder' : [],
            });
            if (teamSnap.empty) {
                console.log('No matching documents.');
                return;
            }
    
            teamSnap.forEach(team => {
                console.log(team.id, '=>', team.data());
                if (!team.data().skippedRounds.includes(currentRound)) {
                    participatingTeams.push(team.id);
                    participatingIds.push(team.data().id);
                }
            });
    
            if (currentRound === 14) {
                currentRound = 0;
                participatingTeams = [];
                participatingIds = [];
            }
            
            if (currentRound % 2 === 0) {
                participatingTeams = participatingTeams.reverse();
                participatingIds = participatingIds.reverse();
            }
    
            const body = {
                'round' : currentRound,
                'timeBegan' : admin.firestore.FieldValue.serverTimestamp(),
                'roundOrder' : participatingTeams,
                'idOrder' : participatingIds,
            };
            
            await roundDoc.set(body);
    
            console.log('onRoundBegan Successful!');
            return response.send(body);
        }

    } catch (e) {
        return response.send({'error' : e.message});
    }
});

export const getRemainingTime = functions.https.onRequest(async (request, response) => {
    try {
        const roundDoc = admin.firestore().doc('drafting/roundStats');
        const roundSnap = await roundDoc.get();
        const beganTimestamp: FirebaseFirestore.Timestamp = roundSnap.data()!.timeBegan;
        const participatingTeams: string[] = roundSnap.data()!.roundOrder;
        const participatingIds: string[] = roundSnap.data()!.idOrder;
        const interval: number = 60;
        const totalTime = participatingTeams.length*interval;
        const timeDifference = (totalTime) - (admin.firestore.Timestamp.now().seconds - beganTimestamp.seconds);

        const currentOrder = Math.floor((totalTime - timeDifference)/interval);
        const currentTeam: string = participatingTeams[currentOrder];
        const currentId: string = participatingIds[currentOrder];

        const minutes = Math.floor(timeDifference/60);
        const seconds = timeDifference % 60;
        console.log('total time: ' + participatingTeams.length + ':00');
        console.log('time remaining: ' + minutes + ':' + seconds);

        const body = {
            'totalTime' : totalTime,
            'currentTeam' : currentTeam,
            'remainingTime' : timeDifference,
            'round' : roundSnap.data()!.round,
            'interval' : interval,
            'currentId' : currentId,
        };

        console.log('getRemainingTime Successful!');
        return response.send(body);
    }
    catch (e) {
        return response.send({'error' : e.message});
    }
}); 