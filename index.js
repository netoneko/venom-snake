const ENV = process.env.NODE_ENV || 'development',
    knex = require('knex')(require('./knexfile.js')[ENV]),
    express = require('express'),
    app = express();

const getAvgChangeNumber = () => {
    return knex.raw(`select avg(changes) as num
from (select date_format(rc_timestamp, '%Y%m%d'), count( * ) as changes
from recentchanges
where rc_namespace = 0
group by 1) b`).then(results => Math.round(results[0][0].num));
};

const mostProductiveMembers = () => {
    return knex.raw(`
select rc_user, rc_user_text as name, sum(rc_new_len) as all_new, sum(rc_old_len) as all_old,
sum((rc_new_len - rc_old_len)) as diff from recentchanges
where rc_namespace = 0
group by 1, 2
having diff > 50000
order by diff desc
`).then(results => results[0]);
};

const getStats = () => {
    return Promise.all([
        getAvgChangeNumber(),
        mostProductiveMembers()
    ]);
};

app.get('/', (req, res) => {
    getStats().then((results) => {
        const avgChangeNumber = results[0],
            productiveMembers = results[1].map(x => {
                return `<li>Участник ${x.name} (${Math.round(x.diff / 1000)}kb)</li>`
            }).join('\n'),
            data = `
<h1>Статистика за последний месяц</h1>
Среднее количество правок в день: ${avgChangeNumber}</br></br>
Пользователи со вкладом более 50 килобайт:<br/>
<ol>${productiveMembers}</ol>`;

        res.send(data);
    }).catch(() => {
        res.send(500, 'Internal server error');
    });
});

app.listen(8000);
