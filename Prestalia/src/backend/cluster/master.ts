import {availableParallelism} from "os";
import {Cluster} from "cluster";
import {join} from "path";
import {watchCertificates} from "../utils/master/functions/watchers";
import {
  compressFiles,
  deleteCompressedFiles,
  error,
  FILE_EXTENSIONS_TO_COMPRESS,
  log,
  workingDirPath,
} from "@server/core";
import exitClusterEvent from "../events/master/cluster/exit";
import messageClusterEvent from "../events/master/cluster/message";
import {ensureSiteCertificate} from "../utils/master/functions/certs";

export default (async (cluster) => {
  if (!cluster.workers) return console.log("Liste des workers manquante");

  log(`Processus primaire lancé`);

  // Check si le certificat est bientôt expiré et si c'est le cas le met à jour et le renvoi à tous les workers
  setInterval(async () => {
    if (cluster.workers) ensureSiteCertificate(cluster.workers);
  }, 21600000 /* 6 heures */);

  await ensureSiteCertificate(cluster.workers, true);

  try {
    const publicDirPath = join(workingDirPath, "public"),
      errorsDirPath = join(workingDirPath, "errors");

    await deleteCompressedFiles(publicDirPath);
    await compressFiles(publicDirPath, FILE_EXTENSIONS_TO_COMPRESS);

    await deleteCompressedFiles(errorsDirPath);
    await compressFiles(errorsDirPath, FILE_EXTENSIONS_TO_COMPRESS);

    log("Site chargé");
  } catch (err) {
    error("Erreur lors de la compression des fichiers:", err);
  }

  watchCertificates();

  // Fork des workers
  for (let i = 0; i < availableParallelism(); i++) cluster.fork();

  cluster
    // Relance automatiquement le worker à ça mort
    .on("exit", exitClusterEvent.bind(null, cluster))
    .on("message", messageClusterEvent);
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  cluster: Cluster,
) => void;
