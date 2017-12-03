import _ from 'lodash';
import Character from './character';
import Situation from './situation';

export default class WorldModel {
    constructor({characters, globalState, situations, initialSituation}) {
        this._characters = {};
        this.currentSituation = null;
        characters.forEach((c) => this._characters[c.id] = new Character(c));
        this.globalState = _.cloneDeep(globalState);
        this.player = this.character('player') || null;
        this._situations = {};
        situations.forEach((s) => this._situations[s.id] = new Situation(s));

        this._initialSituationId = initialSituation;

        // These will be injected when the UI is bound to the director
        this.navHeaderHTML = null;
        this.asideHeaderHTML = null;

        this.allCharacters = _.sortBy(Object.values(this._characters), ({priority}) => priority || 0);
    }

    toSave() {
        return {
            globalState: this.globalState,
            currentSituationId: this.currentSituation ? this.currentSituation.id : null,
            characters: this.allCharacters.map((c) => c.toSave()),
        };
    }

    loadSave(obj) {
        this.globalState = obj.globalState;
        this.currentSituation = this._situations[obj.currentSituationId] || null;
        for (const data of obj.characters) {
            this.character(data.id).loadSave(data);
        }
    }

    toString() {
        return `Model(globalState=${this.globalState}, characters=${this.characters})`;
    }

    /*
    goTo(id) is injected into this class by JumboGroveDirector.
    */

    /*
    handleCommandString(str) is injected into this class by JumboGroveDirector.
    */

    situation(id) {
        if (!this._situations[id]) throw new Error(`Situation not found: ${id}`);
        return this._situations[id];
    }

    situations(idOrTag) {
        if (idOrTag.startsWith("#")) {
            const tag = idOrTag.slice(1);
            return Object.values(this._situations)
                .filter((s) => s.tags.indexOf(tag) !== -1);
        } else {
            return [this._situations[idOrTag]];
        }
    }

    character(id) {
        return this._characters[id];
    }

    random() {
        return Math.random();
    }
    
    setGlobalState(k, v) {
        this.globalState[k] = v;
    }

    setCharacterState(id, k, v) {
        this.character(id)[k] = v;
    }

    interpretChoices(arrayOfSituationIdsOrTags, atLeast = 0, atMost = Number.MAX_VALUE) {
        const host = this.currentSituation;
        const situations = [].concat.apply(
            [], arrayOfSituationIdsOrTags.map(this.situations.bind(this)));
        // remove invisible situations
        const visibleSituations = situations.filter((s) => s.getCanSee(this.model, host));

        // sort by display order
        const sortedSituations = _.sortBy(
            visibleSituations, (s) => s.getDisplayOrder(this.model, host));

        // index by priority; figure out what priorities are being used
        const sortedSituationsByPriority = {};
        const prioritiesSeen = [];
        for (const s of sortedSituations) {
            const p = s.getPriority(this.model, host);
            if (!sortedSituationsByPriority[p]) sortedSituationsByPriority[p] = [];
            sortedSituationsByPriority[p].push(s);
            prioritiesSeen.push(p);
        }

        // figure out what priority we want to use (only one!)
        let chosenPriority = Number.MAX_VALUE;
        for (const p of _.uniq(prioritiesSeen.sort().reverse())) {
            if (sortedSituationsByPriority[p].length >= atLeast) {
                chosenPriority = p;
                break;
            }
        }
        let chosenSituations = sortedSituationsByPriority[chosenPriority];
        if (!chosenSituations) {
            return [];  // Uh oh!
        }

        // Remove random array items until we are under the limit
        while (chosenSituations.length > atMost) {
            const i = Math.floor(this.model.random() * chosenSituations.length);
            chosenSituations.splice(i, 1);
        }

        // return the chosen situations and provide more info for each
        return chosenSituations.map((s) => {
            return {
                situationId: s.id,
                text: s.getOptionText(this.model, host),
                isEnabled: s.getCanChoose(this.model, host),
            };
        });
    }
}