import { feature } from 'topojson'


async function fetchAsync(path) {
	let response = await fetch(path)
	return response.json();
}

export default async function loadTopoJSON(topojson, feature_id) {
	const content = await fetchAsync(topojson)
	return feature(content, content.objects[feature_id]).features
}