var chai = require('chai');
var expect = chai.expect;
var Pouch = require('pouchdb');
var root = '';
var doc1 = {
    "_id": "c240s1",
    "chapter": "240",
    "title": "III",
    "href": "/Laws/GeneralLaws/PartIII/TitleIII/Chapter240/Section1",
    "text": "If the record title of land is clouded by an adverse claim, or by the possibility thereof, a person in possession of such land claiming an estate of freehold therein or an unexpired term of not less than ten years, and a person who by force of the covenants in a deed or otherwise may be liable in damages, if such claim should be sustained, may file a petition in the land court stating his interest, describing the land, the claims and the possible adverse claimants so far as known to him, and praying that such claimants may be summoned to show cause why they should not bring an action to try such claim. If no better description can be given, they may be described generally, as the heirs of A B or the like. Two or more persons having separate and distinct parcels of land in the same county and holding under the same source of title, or persons having separate and distinct interests in the same parcel or parcels, may join in a petition against the same supposed claimants. If the supposed claimants are residents of the commonwealth, the petition may be inserted like a declaration in a writ, and served by a copy, like a writ of original summons. Whoever is in the enjoyment of an easement shall be held to be in possession of land within the meaning of this section",
    "section": "1",
    "part": "III",
    "type": "general",
    "desc": "Petition to compel adverse claimant to try title"
};
var doc2 = {
    "_id": "c240s10",
    "chapter": "240",
    "title": "III",
    "href": "/Laws/GeneralLaws/PartIII/TitleIII/Chapter240/Section10",
    "text": "After all the defendants have been served with process or notified as provided in section seven and after the appointment of a guardian ad litem or next friend, if such appointment has been made, the court may proceed as though all defendants had been actually served with process. Such action shall be a proceeding in rem against the land, and a judgment establishing or declaring the validity, nature or extent of the plaintiff’s title may be entered, and shall operate directly on the land and have the force of a release made by or on behalf of all defendants of all claims inconsistent with the title established or declared thereby. This and the four preceding sections shall not prevent the court from also exercising jurisdiction in personam against defendants actually served with process who are personally amenable to its judgments",
    "section": "10",
    "part": "III",
    "type": "general",
    "desc": "Proceeding in rem; effect of judgment"
};
var doc3 = {
    "_id": "c240s10A",
    "chapter": "240",
    "title": "III",
    "href": "/Laws/GeneralLaws/PartIII/TitleIII/Chapter240/Section10A",
    "text": "The superior court and the land court shall have concurrent jurisdiction of a civil action by any person or persons claiming an estate of freehold, or an unexpired term of not less than ten years, in land subject to a restriction described in section twenty-six of chapter one hundred and eighty-four, to determine and declare whether and in what manner and to what extent and for the benefit of what land the restriction is then enforceable, whether or not a violation has occurred or is threatened. The complaint shall state the names and addresses, so far as known to the plaintiff or plaintiffs, of the owners of the subject parcels as to which the determination is sought, of the owners of any benefited land and of any persons benefited other than persons interested in benefited land. There shall be filed therewith (1) a certified copy of the instrument or instruments imposing the restriction, or of a representative instrument if there are many and the complaint includes a summary of the remainder, and (2) a plan or sketch showing the approximate locations of the parcels as to which the determination is sought, and the other parcel or parcels, if any, which may have the benefit of the restriction, and the ways, public or open to public use, upon which the respective parcels abut or nearest thereto, and the street numbers, if any, of such parcels",
    "section": "10A",
    "part": "III",
    "type": "general",
    "desc": "Restrictions on land; determination; jurisdiction; petition"
};
var doc4 = {
    "_id": "_design/find",
    indexes: {
        things: {
            index: function(doc) {
                if (doc.text) {
                    index('default', doc.text);
                }
                if (doc.desc) {
                    index('title', doc.desc);
                }
            }.toString()
        }
    }
};
Pouch.plugin({
    'search': require('../pouchdb.search')
});

describe('search', function() {

    function tests(name, root) {
        describe(name, function() {
            this.timeout(5000);
            var db;
            var i = 0;

            beforeEach(function(done) {
                i++;
                Pouch(root + 'dbbasic' + i, function(err, d) {
                    if (err) {
                        console.log(err);
                        return done(err);
                    }
                    db = d;
                    db.bulkDocs({
                        docs: [doc1, doc2, doc3, doc4]
                    }, function() {
                        done();
                    })
                });
            });

            afterEach(function(done) {
                db = undefined;
                Pouch.destroy(root + 'dbbasic' + i, function() {
                    done();
                });
            });

            if (name === 'level') {
                it('basic', function(done) {
                    db.search(function(doc) {
                        if (doc.desc) {
                            index('default', doc.desc);
                        }
                    }, {
                        q: 'land'
                    }, function(_, result) {
                        expect(result.rows.length).to.equal(1);
                        expect(result.rows[0].id).to.equal('c240s10A');
                        done(_);
                    });
                });
            }

            it('should work with an removed doc', function(done) {
                db.get('c240s1').then(function(doc) {
                    return db.remove(doc);
                }).then(function() {
                    return db.search("find/things", {
                        q: 'freehold'
                    }).then(function(result) {
                        result = result.rows.map(function(v) {
                            return v.id;
                        });
                        expect(result[0]).to.equal("c240s10A");
                        return;
                    });
                }).then(done, done);
            });

            it('should work with a doc', function(done) {
                db.search("find/things", {
                    q: 'freehold'
                }).then(function(result) {
                    expect(result.rows.length).to.equal(2);
                    result = result.rows.map(function(v) {
                        return v.id;
                    })
                    expect(result).deep.to.equal(["c240s10A", "c240s1"]);
                    return;
                }).then(done, done);
            });

            it('should work with an updated doc', function(done) {
                db.get('c240s1').then(function(doc) {
                    doc.text = 'no';
                    return db.put(doc);
                }).then(function() {
                    return db.search("find/things", {
                        q: 'freehold'
                    }).then(function(result) {
                        expect(result.rows.length).to.equal(1);
                        result = result.rows.map(function(v) {
                            return v.id;
                        });
                        expect(result).deep.to.equal(["c240s10A"]);
                        return;
                    });
                }).then(done, done);
            });

            it('should work with a more complex thing', function(done) {
                db.search("find/things", {
                    q: 'title:rem'
                }).then(function(result) {
                    expect(result.rows.length).to.equal(1);
                    result = result.rows.map(function(v) {
                        return v.id;
                    });
                    expect(result).deep.to.equal(["c240s10"]);
                    return;
                }).then(done, done);
            });
        });
    }
    tests('level', '');
    tests('cloudant', root);
});
