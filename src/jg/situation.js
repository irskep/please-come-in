import _ from 'lodash';

const nop = () => { };
const tru = () => true;
export default class Situation {
    constructor({
        id,
        tags = [],
        totalVisits = 0,
        // (model, hostSituation)
        getCanChoose = tru,
        // (model, hostSituation)
        getCanSee = tru,
        // number or (model, hostSituation)
        priority = 0,
        // number or (model, hostSituation)
        displayOrder = 0,
        // str or (model, hostSituation)
        optionText = null,
        // (model, ui, fromSituation)
        enter = nop,
        // (model, ui, action)
        act = nop,
        // {actionId: (model, ui) => Void}
        actions = {},
        // (model, ui, toSituation)
        exit = nop,
        // str (rendered as HTML before enter() called)
        content = null,
        // [str] (if specified, presentChoices() will happen automatically)
        choices = null,
        snippets = {},
    }) {
        Object.assign(this, {
            id, tags, totalVisits, getCanChoose, getCanSee, priority,
            displayOrder, optionText, enter, act, exit, content, actions, choices,
            snippets,
        });
    }

    doEnter(model, ui) {
        if (this.content) {
            ui.logMarkdown(this.content);
        }
        this.enter.apply(this, arguments);
        if (this.choices) {
            ui.presentChoices(this.choices).then((situationId) => {
                model.goTo(situationId);
            });
        }
    }

    doExit(model, ui, toSituation) {
        this.totalVisits += 1;
        ui.nextGroup();
        this.exit.apply(this, arguments);
    }

    doAct(model, ui, action) {
        if (this.actions && this.actions[action]) {
            this.actions[action](model, ui);
        } else {
            this.act(model, ui, action);
        }
    }

    getOptionText() {
        if (_.isFunction(this.optionText)) {
            return this.optionText.apply(this, arguments);
        } else {
            return this.optionText || this.id;
        }
    }

    getPriority() {
        if (_.isFunction(this.priority)) {
            return this.priority.apply(this, arguments);
        } else {
            return this.priority;
        }
    }

    getDisplayOrder() {
        if (_.isFunction(this.displayOrder)) {
            return this.displayOrder.apply(this, arguments);
        } else {
            return this.displayOrder;
        }
    }
}