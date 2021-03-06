const path = require('path'),
      _ = require('lodash');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Tag extends Model {

  /**
   * create a new tag
   *
   */
  static async create({ tagname, creator }) {
    // create the tag
    const tag = schema({ tagname });
    const query = `
      FOR u IN users FILTER u.username == @creator
        INSERT MERGE(@tag, { creator: u._id }) IN tags
          RETURN NEW`;
    const params = { tag, creator };

    await this.db.query(query, params);
  }

  static async read(tagname) {
    const query = `
      FOR t IN tags FILTER t.tagname == @tagname
        RETURN KEEP(t, 'tagname', 'created')`;
    const params = { tagname };
    const out = await (await this.db.query(query, params)).all();

    const tag = _.pick(out[0], 'tagname', 'created');

    return (out[0]) ? tag : null;
  }

  /**
   * Return an array of random tags
   * @param {number} [limit] - amount of tags to return, defaults to 1
   * @returns Promise<Tag[]> - returns array of tags
   */
  static async random(limit) {
    limit = limit || 1;
    const query = `
      FOR t IN tags
        SORT RAND()
        LIMIT @limit
        RETURN KEEP(t, 'tagname', 'created')
    `;
    const params = { limit };
    const out = await (await this.db.query(query, params)).all();
    return out;
  }

  static async exists(tagname) {
    const query = `
      FOR t IN tags FILTER t.tagname == @tagname
        COLLECT WITH COUNT INTO length
        RETURN length`;
    const params = { tagname };
    const count = await (await this.db.query(query, params)).next();

    switch (count) {
      case 0:
        return false;
      case 1:
        return true;
      default:
        throw new Error('bad output');
    }
  }

  // get tags which start with likeTagname string
  static async filter(likeTagname) {
    const query = `
      FOR t IN tags
        FILTER t.tagname LIKE CONCAT(@likeTagname, '%')
        OR     t.tagname LIKE CONCAT('%-', @likeTagname, '%')
        RETURN KEEP(t, 'username', 'tagname', 'created')`;
    // % serves as a placeholder for multiple characters in arangodb LIKE
    // _ serves as a placeholder for a single character
    const params = { likeTagname };
    const out = await (await this.db.query(query, params)).all();

    const formatted = [];

    for(const tag of out) {
      formatted.push(_.pick(tag, ['tagname']));
    }

    return formatted;
  }

  /**
   * find tags related to tags of a user
   * @param {string} username - username of the user
   * @returns Promise<object[]> - array of the found tags (including relevance parameter)
   */
  static async findTagsRelatedToTagsOfUser(username) {
    const query = `
      FOR u IN users FILTER u.username == @username

        // find the tags of user (to later exclude them from results)
        LET utags = (FOR v IN 1..1 ANY u ANY userTag RETURN v.tagname)

        FOR v, e, p IN 3..3
          ANY u
          ANY userTag
          FILTER NOT(v.tagname IN utags) // filter out the tags of user

          // count the relevance for each found path
          // (geometric mean of edge relevances)
          LET relevanceWeight = POW(p.edges[0].relevance*p.edges[1].relevance*p.edges[2].relevance, 1/3)

          COLLECT tag = v INTO asdf KEEP relevanceWeight
          LET finalTag = KEEP(tag, 'tagname', 'created')
          // sum the relevance of found paths
          LET weightSum = SUM(asdf[*].relevanceWeight)
          SORT weightSum DESC
          LIMIT 5
          RETURN MERGE(finalTag, { relevance: weightSum })
    `;
    // % serves as a placeholder for multiple characters in arangodb LIKE
    // _ serves as a placeholder for a single character
    const params = { username };
    const out = await (await this.db.query(query, params)).all();

    return out;
  }

  /**
   * delete all tags which have no userTag edges
   *
   *
   */
  static async deleteAbandoned() {
    const query = `
      FOR t IN tags
        LET e=(FOR e IN userTag
            FILTER e._to == t._id
            RETURN e)
        FILTER LENGTH(e) < 1
        REMOVE t IN tags RETURN KEEP(OLD, 'tagname')`;
    // % serves as a placeholder for multiple characters in arangodb LIKE
    // _ serves as a placeholder for a single character
    const out = await (await this.db.query(query)).all();

    return out;
  }

  /**
   * counts all tags
   */
  static async count() {
    const query = `
      FOR t IN tags
        COLLECT WITH COUNT INTO length
        RETURN length`;
    const count = await (await this.db.query(query)).next();

    return count;
  }
}


module.exports = Tag;
